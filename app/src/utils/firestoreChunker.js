import { db } from "../firebase";
import { doc, setDoc, getDocs, collection, deleteDoc } from "firebase/firestore";

const CHUNK_SIZE = 800 * 1024; // 800KB per chunk to stay safely below Firestore's 1MB limit

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const deletePdfFromFirestore = async (flipbookId) => {
  try {
    const chunksRef = collection(db, `flipbooks/${flipbookId}/chunks`);
    const snap = await getDocs(chunksRef);
    if (!snap.empty) {
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    }
  } catch (err) {
    console.error("Error deleting old chunks:", err);
  }
};

export const savePdfToFirestore = async (flipbookId, file) => {
  try {
    const base64String = await fileToBase64(file);
    
    // First, clear any existing chunks for this flipbook to avoid orphans
    await deletePdfFromFirestore(flipbookId);
    
    const chunks = [];
    for (let i = 0; i < base64String.length; i += CHUNK_SIZE) {
      chunks.push(base64String.substring(i, i + CHUNK_SIZE));
    }
    
    // Upload chunks in parallel
    await Promise.all(chunks.map((chunkData, index) => {
      const chunkRef = doc(db, `flipbooks/${flipbookId}/chunks`, `chunk_${index}`);
      return setDoc(chunkRef, {
        index,
        data: chunkData
      });
    }));
    
    return chunks.length; // Returns number of chunks saved
  } catch (err) {
    console.error("Error saving PDF to Firestore chunks:", err);
    throw err;
  }
};

export const loadPdfFromFirestore = async (flipbookId) => {
  try {
    const chunksRef = collection(db, `flipbooks/${flipbookId}/chunks`);
    const snap = await getDocs(chunksRef);
    if (snap.empty) return null;
    
    // Sort chunks by index to ensure proper reassembly
    const chunks = snap.docs.map(doc => doc.data()).sort((a, b) => a.index - b.index);
    const fullBase64 = chunks.map(c => c.data).join("");
    
    // Convert base64 back to blob using native fetch API
    const fetchResponse = await fetch(`data:application/pdf;base64,${fullBase64}`);
    const blob = await fetchResponse.blob();
    return blob;
  } catch (err) {
    console.error("Error loading PDF from chunks:", err);
    return null;
  }
};
