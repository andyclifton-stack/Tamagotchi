export default function Card({ children, className = '', ...props }) {
  return (
    <section className={`ui-card${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </section>
  );
}
