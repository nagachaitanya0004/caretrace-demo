function Card({ children, className = "", ...props }) {
  return (
    <div
      {...props}
      className={`card-premium p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;