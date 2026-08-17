
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { useBuilder } from '../store/builderStore';

const modes = [
  { id: 'desktop', icon: Monitor, label: 'Bureau' },
  { id: 'tablet',  icon: Tablet,  label: 'Tablette' },
  { id: 'mobile',  icon: Smartphone, label: 'Mobile' }
];

export default function DevicePreview() {
  const { previewMode, setPreviewMode } = useBuilder();

  return (
    <div className="pb-device-group" role="group" aria-label="Mode d'aperçu réactif">
      {modes.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          className={`pb-device-btn${previewMode === id ? ' active' : ''}`}
          onClick={() => setPreviewMode(id)}
          title={label}
          aria-label={label}
          aria-pressed={previewMode === id}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}
