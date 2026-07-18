import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";
import CreateRedisConfigModal from "./CreateRedisConfigModal";
import KongDeleteConfirmModal from "../components/KongDeleteConfirmModal";
import KongTableSkeletonRows from "../components/KongTableSkeletonRows";
import "./redis.css";

export default function RedisConfig() {
  const [configs, setConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [editData, setEditData] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setIsLoading(true);

    setTimeout(() => {
      setConfigs([
        {
          id: "1",
          name: "Redis Prod",
          redisType: "HostPort (Enterprise)",
          authProvider: "AWS",
          host: "127.0.0.1",
          port: "6379",
          database: "0",
          username: "admin",
          password: "******",
          proxied: true,
          ssl: true,
          sslVerify: true,
          serverName: "redis-prod",
          keepaliveBacklog: "0",
          keepalivePoolSize: "256",
          readTimeout: "2000",
          sendTimeout: "2000",
          connectTimeout: "2000",
          tags: ["prod", "critical"],
        },
        {
          id: "2",
          name: "Redis Dev",
          redisType: "Cluster",
          authProvider: "",
          host: "192.168.1.10",
          port: "6379",
          database: "1",
          username: "",
          password: "",
          proxied: false,
          ssl: false,
          sslVerify: false,
          serverName: "",
          keepaliveBacklog: "0",
          keepalivePoolSize: "128",
          readTimeout: "2000",
          sendTimeout: "2000",
          connectTimeout: "2000",
          tags: ["dev"],
        },
      ]);

      setIsLoading(false);
    }, 500);
  }, []);

  const handleDelete = (id) => {
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSave = (data) => {
    if (data.id) {
      setConfigs((prev) =>
        prev.map((c) => (c.id === data.id ? data : c))
      );
    } else {
      setConfigs((prev) => [
        ...prev,
        { ...data, id: Date.now().toString() },
      ]);
    }
  };

  const filtered = configs.filter((c) =>
    (
      c.name +
      " " +
      c.redisType +
      " " +
      c.host +
      " " +
      (c.tags?.join(" ") || "")
    )
      .toLowerCase()
      .includes(search.toLowerCase())
  )
  .sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );

  return (
    <div className="p-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Redis Configurations</h1>

        <div className="flex gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search redis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-[16rem]"
              style={{ paddingLeft: "2rem" }}
            />
            <span className="absolute left-2 top-3 text-gray-400">
              <Search size={16} />
            </span>
          </div>

          <button
            onClick={() => {
              setEditData(null);
              setViewMode(false);
              setOpenCreate(true);
            }}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-white shadow-lg shadow-primary/30"
          >
            <Plus size={16} /> New Redis
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="kong-table-wrap">
        <table className="kong-table">
          <thead>
            <tr>
              <th className="text-left">Name</th>
              <th className="text-left">Type</th>
              <th className="text-left">Host</th>
              <th className="text-left">Port</th>
              <th className="text-left">SSL</th>
              <th className="text-left">Proxied</th>
              <th className="text-left">Auth</th>
              <th className="text-left">Tags</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoading && (
              <KongTableSkeletonRows columns={9} />
            )}

            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="kong-table-empty">
                  No redis configurations found
                </td>
              </tr>
            )}

            {!isLoading && filtered.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.redisType}</td>
                <td>{c.host}</td>
                <td>{c.port}</td>
                <td>{c.ssl ? "Yes" : "No"}</td>
                <td>{c.proxied ? "Yes" : "No"}</td>
                <td>{c.authProvider || "-"}</td>

                <td>
                  <div className="flex flex-wrap gap-1">
                    {c.tags?.length ? (
                      c.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs bg-slate-700 rounded text-white"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      "-"
                    )}
                  </div>
                </td>

                <td className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setEditData(c);
                      setViewMode(true);
                      setOpenCreate(true);
                    }}
                    className="text-teal-400"
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    onClick={() => {
                      setEditData(c);
                      setViewMode(false);
                      setOpenCreate(true);
                    }}
                    className="text-blue-400"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => setDeleteTarget(c)}
                    className="text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {openCreate && (
        <CreateRedisConfigModal
          onClose={() => setOpenCreate(false)}
          onSave={handleSave}
          editData={editData}
          viewMode={viewMode}
        />
      )}
      {deleteTarget && (
        <KongDeleteConfirmModal
          resourceName="Redis configuration"
          itemName={deleteTarget.name || deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            handleDelete(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
