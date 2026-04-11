function Card({ children, className = "", ...props }) {
  return (
    <div
      {...props}
      className={`bg-white rounded-xl shadow-md border border-gray-100 p-6 transition-all duration-200 ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;