export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Основной корпус двигателя */}
      <rect x="28" y="30" width="140" height="80" rx="12" stroke="#D4900A" strokeWidth="8" fill="none" />

      {/* Патрубок слева */}
      <rect x="4" y="58" width="24" height="24" rx="5" stroke="#D4900A" strokeWidth="7" fill="none" />

      {/* Голова справа (овал) */}
      <path d="M168 50 Q200 50 200 70 Q200 90 168 90" stroke="#D4900A" strokeWidth="8" fill="none" strokeLinecap="round" />

      {/* Две трубки сверху */}
      <rect x="68" y="14" width="16" height="18" rx="4" stroke="#D4900A" strokeWidth="7" fill="none" />
      <rect x="112" y="14" width="16" height="18" rx="4" stroke="#D4900A" strokeWidth="7" fill="none" />

      {/* Нижний выступ */}
      <rect x="80" y="108" width="36" height="18" rx="4" stroke="#D4900A" strokeWidth="7" fill="none" />

      {/* Текст АВТО ПИЛОТ */}
      <text
        x="98"
        y="65"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontWeight="700"
        fontSize="20"
        fill="#D4900A"
        letterSpacing="1"
      >
        АВТО
      </text>
      <text
        x="98"
        y="88"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontWeight="700"
        fontSize="20"
        fill="#D4900A"
        letterSpacing="1"
      >
        ПИЛОТ
      </text>
    </svg>
  );
}
