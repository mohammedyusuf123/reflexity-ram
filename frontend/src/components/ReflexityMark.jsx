export default function ReflexityMark({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-testid="reflexity-mark"
    >
      <rect width="64" height="64" rx="14" fill="#0e0e12" stroke="#26262c" />
      <path
        d="M19 47V17h13.5c5.8 0 10 3.7 10 9.4 0 4.2-2.4 7.3-6.2 8.6L44 47h-7.1l-6.7-10.6h-4.8V47H19zm6.4-16.4h6.7c2.9 0 4.7-1.5 4.7-4.1 0-2.6-1.8-4.1-4.7-4.1h-6.7v8.2z"
        fill="#f5f5f7"
      />
    </svg>
  );
}
