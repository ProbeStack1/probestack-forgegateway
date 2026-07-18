export default function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      
      <div className="w-[520px] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-dark-700">
          <h3 className="text-white font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}