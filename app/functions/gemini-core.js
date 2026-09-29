const { HttpsError } = require('firebase-functions/v2/https');

function createGenerateHandler({ getKey, fetchImpl, consumeQuota, verifyAdmin }) {
  return async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Connexion requise.');
    if (request.auth.token.admin !== true || !await verifyAdmin(request.auth.uid)) {
      throw new HttpsError('permission-denied', 'Droits administrateur requis.');
    }
    const { prompt, systemInstruction = '' } = request.data || {};
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 10000 ||
        typeof systemInstruction !== 'string' || systemInstruction.length > 2000) {
      throw new HttpsError('invalid-argument', 'Texte vide ou trop long.');
    }
    const key = getKey();
    if (!key) throw new HttpsError('failed-precondition', 'Assistant non configuré.');
    await consumeQuota(request.auth.uid);
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt.trim() }] }],
      generationConfig: { maxOutputTokens: 4096 }
    };
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
    let response;
    try {
      response = await fetchImpl('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000)
      });
    } catch (_) {
      throw new HttpsError('unavailable', 'Assistant temporairement indisponible.');
    }
    if (!response.ok) {
      throw new HttpsError(response.status === 429 ? 'resource-exhausted' : 'unavailable', 'Génération indisponible. Réessayez plus tard.');
    }
    let data;
    try { data = await response.json(); }
    catch (_) { throw new HttpsError('unavailable', 'Réponse de génération invalide.'); }
    const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!text) throw new HttpsError('failed-precondition', 'Aucun texte généré. Précisez le sujet.');
    return { text };
  };
}

function nextQuota(previous, now) {
  const minute = Math.floor(now / 60000);
  const day = Math.floor(now / 86400000);
  const minuteCount = previous?.minute === minute ? previous.minuteCount : 0;
  const dayCount = previous?.day === day ? previous.dayCount : 0;
  if (minuteCount >= 10 || dayCount >= 200) {
    throw new HttpsError('resource-exhausted', 'Limite de génération atteinte.');
  }
  return { minute, day, minuteCount: minuteCount + 1, dayCount: dayCount + 1 };
}

module.exports = { createGenerateHandler, nextQuota };
