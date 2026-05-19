export default function SectionLabel({ num, children }) {
  return (
    <div className="section-label" data-testid={`section-label-${num}`}>
      <span className="num">{num}</span>
      <span>/</span>
      <span>{children}</span>
    </div>
  );
}
