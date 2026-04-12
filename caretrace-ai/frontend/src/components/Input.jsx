function Input({ label, type = "text", placeholder, value, onChange, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/20 focus:border-zinc-400 transition-all text-sm bg-white"
        {...props}
      />
    </div>
  );
}

export default Input;