export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`ui-button ui-button--${variant} ui-button--${size}${block ? ' ui-button--block' : ''}${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </button>
  );
}
