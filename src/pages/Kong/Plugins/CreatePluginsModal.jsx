import { useEffect, useMemo, useState } from "react";
import { X, ChevronDown, Layers, ArrowLeft, ArrowRight } from "lucide-react";
import PluginConfigPanel from "./PluginConfigPanel";
import {
  findPluginDefinitionFromEntity,
  getPluginDefinition,
  getPluginsByType,
  KONG_PLUGIN_TYPES,
} from "./pluginFormConfig";

export default function CreatePluginsModal({
  onClose,
  onSubmit,
  onSuccess,
  editData = null,
  isOnlyContent,
  onBack,
  onNext,
  viewMode
}) {
  //prevent rendering when not open
  // if (!isOpen) return null;

  const initialPlugin =
    findPluginDefinitionFromEntity(editData) ||
    getPluginsByType(KONG_PLUGIN_TYPES[0])[0] ||
    null;

  const [selectedType, setSelectedType] = useState(
    initialPlugin?.type || KONG_PLUGIN_TYPES[0] || ""
  );
  const [selectedPluginKey, setSelectedPluginKey] = useState(
    initialPlugin?.key || ""
  );
  const [openDropdown, setOpenDropdown] = useState(false);

  const plugins = useMemo(
    () => getPluginsByType(selectedType),
    [selectedType]
  );

  const selectedPlugin = useMemo(
    () =>
      getPluginDefinition(selectedPluginKey) ||
      plugins[0] ||
      null,
    [plugins, selectedPluginKey]
  );

  //ensure valid plugin selection
  useEffect(() => {
    if (!plugins.length) {
      setSelectedPluginKey("");
      return;
    }

    const exists = plugins.some(
      (plugin) => plugin.key === selectedPluginKey
    );

    if (!exists) {
      setSelectedPluginKey(plugins[0].key);
    }
  }, [plugins, selectedPluginKey]);

  // sync with editData
  useEffect(() => {
    const nextPlugin = findPluginDefinitionFromEntity(editData);
    if (!nextPlugin) return;

    setSelectedType(nextPlugin.type);
    setSelectedPluginKey(nextPlugin.key);
  }, [editData]);

  return (
    <div className={isOnlyContent ? "" : "fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"}>
      <div className={isOnlyContent ? "" : "w-[80%] max-h-[90vh] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg flex flex-col"}>

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">
            {isOnlyContent ? "Add Plugins" : editData ? "Edit Plugin" : "Plugin Catalog"}
          </h2>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            {!isOnlyContent && <X size={18} />}
          </button>
        </div>

        {/* Plugin Type Dropdown */}
        <div className="px-6 py-3 border-b border-dark-700 relative">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400 w-[5rem]">
              Plugin Type
            </label>

            <div
              onClick={() => setOpenDropdown((prev) => !prev)}
              className="flex items-center justify-between w-[260px] px-3 py-2 border border-dark-700 rounded-lg cursor-pointer bg-[#15192b]"
            >
              <span className="text-sm text-gray-300">
                {selectedType}
              </span>
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          </div>

          {openDropdown && (
            <div className="absolute left-[7rem] mt-2 w-[260px] bg-[#15192b] border border-dark-700 rounded-lg shadow-lg z-10">
              {KONG_PLUGIN_TYPES.map((type) => (
                <div
                  key={type}
                  onClick={() => {
                    setSelectedType(type);
                    setOpenDropdown(false);
                  }}
                  className="px-3 py-2 text-sm hover:bg-slate-800 cursor-pointer"
                >
                  {type}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left Panel */}
          <div className="w-[260px] border-r border-dark-700 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">
              Plugins
            </h3>

            {!plugins.length ? (
              <div className="text-xs text-gray-500">
                Select a type to view plugins
              </div>
            ) : (
              <div className="space-y-2">
                {plugins.map((plugin) => (
                  <div
                    key={plugin.key}
                    onClick={() => setSelectedPluginKey(plugin.key)}
                    className={`p-3 rounded-lg cursor-pointer border ${selectedPlugin?.key === plugin.key
                        ? "border-primary bg-primary/10"
                        : "border-dark-700 hover:border-primary"
                      }`}
                  >
                    <div className="flex items-center gap-2 relative">
                      <Layers size={14} className="text-primary" />
                      <span className="text-sm">
                        {plugin.label}
                      </span>
                      <ArrowRight
                        className="absolute right-0"
                        size={16}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-400 pr-5">
                      {plugin.desc}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            {!selectedPlugin ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <h2 className="mt-6 text-lg font-semibold text-white">
                  No Plugins Selected
                </h2>
                <p className="mt-2 text-sm text-gray-400 max-w-sm">
                  Select plugin from the left panel to configure.
                </p>
                <div className="mt-6 flex items-center gap-2 text-primary animate-pulse">
                  <ArrowLeft size={16} />
                  <span className="text-sm">
                    Choose a plugin from here
                  </span>
                </div>
              </div>
            ) : (
              <PluginConfigPanel
                key={`${selectedPlugin.key}-${editData?.id || "create"}`}
                plugin={selectedPlugin}
                editData={editData}
                onClose={onClose}
                viewMode={viewMode}
                onSuccess={(data) => {
                  //reusable logic
                  if (onSubmit) {
                    onSubmit(data);
                  } else if (onSuccess) {
                    onSuccess(data);
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
      {isOnlyContent &&
        <div className="flex justify-between mt-6 pt-6 border-t border-dark-700">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 rounded-lg font-semibold text-sm transition-all bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-600 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            className="px-6 py-2 rounded-lg font-semibold text-sm transition-all bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 flex items-center gap-2"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>}
    </div>
  );
}







// import { useEffect, useMemo, useState } from "react";
// import { X, ChevronDown, Layers, ArrowLeft, ArrowRight } from "lucide-react";
// import PluginConfigPanel from "./PluginConfigPanel";
// import {
//   findPluginDefinitionFromEntity,
//   getPluginDefinition,
//   getPluginsByType,
//   KONG_PLUGIN_TYPES,
// } from "./pluginFormConfig";

// export default function CreatePluginsModal({ onClose, onSuccess, editData = null }) {
//   const initialPlugin = findPluginDefinitionFromEntity(editData) || getPluginsByType(KONG_PLUGIN_TYPES[0])[0] || null;

//   const [selectedType, setSelectedType] = useState(initialPlugin?.type || KONG_PLUGIN_TYPES[0] || "");
//   const [selectedPluginKey, setSelectedPluginKey] = useState(initialPlugin?.key || "");
//   const [openDropdown, setOpenDropdown] = useState(false);

//   const plugins = useMemo(() => getPluginsByType(selectedType), [selectedType]);
//   const selectedPlugin = useMemo(
//     () => getPluginDefinition(selectedPluginKey) || plugins[0] || null,
//     [plugins, selectedPluginKey]
//   );

//   useEffect(() => {
//     if (!plugins.length) {
//       setSelectedPluginKey("");
//       return;
//     }

//     const hasSelectedPlugin = plugins.some((plugin) => plugin.key === selectedPluginKey);
//     if (!hasSelectedPlugin) {
//       setSelectedPluginKey(plugins[0].key);
//     }
//   }, [plugins, selectedPluginKey]);

//   useEffect(() => {
//     const nextPlugin = findPluginDefinitionFromEntity(editData);
//     if (!nextPlugin) {
//       return;
//     }

//     setSelectedType(nextPlugin.type);
//     setSelectedPluginKey(nextPlugin.key);
//   }, [editData]);

//   return (
//     <div className="h-full fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
//       <div className="h-full w-[80%] rounded-xl border border-dark-700 bg-[#15192b]/95 backdrop-blur-xl shadow-lg flex flex-col">
//         <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700">
//           <h2 className="text-lg font-semibold text-white">
//             {editData ? "Edit Plugin" : "Plugin Catalog"}
//           </h2>

//           <button onClick={onClose} className="text-gray-400 hover:text-white">
//             <X size={18} />
//           </button>
//         </div>

//         <div className="px-6 py-3 border-b border-dark-700 relative">
//           <div className="flex items-center gap-2">
//             <label className="text-sm text-gray-400 w-[5rem]">Plugin Type</label>

//             <div
//               onClick={() => setOpenDropdown((prev) => !prev)}
//               className="flex items-center justify-between w-[260px] px-3 py-2 border border-dark-700 rounded-lg cursor-pointer bg-[#15192b]"
//             >
//               <span className="text-sm text-gray-300">{selectedType}</span>
//               <ChevronDown size={16} className="text-gray-400" />
//             </div>
//           </div>

//           {openDropdown && (
//             <div className="absolute left-[7rem] mt-2 w-[260px] bg-[#15192b] border border-dark-700 rounded-lg shadow-lg z-10">
//               {KONG_PLUGIN_TYPES.map((type) => (
//                 <div
//                   key={type}
//                   onClick={() => {
//                     setSelectedType(type);
//                     setOpenDropdown(false);
//                   }}
//                   className="px-3 py-2 text-sm hover:bg-slate-800 cursor-pointer"
//                 >
//                   {type}
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         <div className="flex flex-1 overflow-hidden">
//           <div className="w-[260px] border-r border-dark-700 p-4 overflow-y-auto">
//             <h3 className="text-sm font-semibold text-gray-300 mb-4">Plugins</h3>

//             {!plugins.length ? (
//               <div className="text-xs text-gray-500">Select a type to view plugins</div>
//             ) : (
//               <div className="space-y-2">
//                 {plugins.map((plugin) => (
//                   <div
//                     key={plugin.key}
//                     onClick={() => setSelectedPluginKey(plugin.key)}
//                     className={`p-3 rounded-lg cursor-pointer border ${
//                       selectedPlugin?.key === plugin.key
//                         ? "border-primary bg-primary/10"
//                         : "border-dark-700 hover:border-primary"
//                     }`}
//                   >
//                     <div className="flex items-center gap-2 relative">
//                       <Layers size={14} className="text-primary" />
//                       <span className="text-sm">{plugin.label}</span>
//                       <ArrowRight className="absolute right-0" size={16} />
//                     </div>
//                     <p className="mt-2 text-xs text-gray-400 pr-5">{plugin.desc}</p>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//           <div className="flex-1 p-6 overflow-y-auto">
//             {!selectedPlugin ? (
//               <div className="h-full flex flex-col items-center justify-center text-center relative overflow-hidden">
//                 <h2 className="mt-6 text-lg font-semibold text-white">No Plugins Selected</h2>
//                 <p className="mt-2 text-sm text-gray-400 max-w-sm">
//                   Select plugin from the left panel to configure.
//                 </p>
//                 <div className="mt-6 flex items-center gap-2 text-primary animate-pulse">
//                   <ArrowLeft size={16} />
//                   <span className="text-sm">Choose a plugin from here</span>
//                 </div>
//               </div>
//             ) : (
//               <PluginConfigPanel
//                 key={`${selectedPlugin.key}-${editData?.id || "create"}`}
//                 plugin={selectedPlugin}
//                 editData={editData}
//                 onClose={onClose}
//                 onSuccess={onSuccess}
//               />
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

