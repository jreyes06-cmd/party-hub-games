import { Card as UNOCardType, getCardColor, getCardDisplay } from '@/lib/uno';

interface UNOCardProps {
  card: UNOCardType;
  onClick?: () => void;
  disabled?: boolean;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function UNOCard({
  card,
  onClick,
  disabled = false,
  isSelected = false,
  size = 'md',
}: UNOCardProps) {
  const sizeClasses = {
    sm: 'w-16 h-24',
    md: 'w-20 h-32',
    lg: 'w-24 h-36',
  };

  const bgColor = getCardColor(card);
  const display = getCardDisplay(card);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        rounded-lg font-bold text-white relative
        transition-all cursor-pointer
        ${!disabled && 'hover:scale-110 hover:shadow-lg'}
        ${disabled && 'opacity-50 cursor-not-allowed'}
        ${isSelected && 'ring-2 ring-offset-2 ring-primary'}
      `}
      style={{
        backgroundColor: bgColor,
        boxShadow: isSelected ? undefined : '0 4px 6px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div className="w-full h-full flex items-center justify-center text-center">
        <span className="text-xs sm:text-sm md:text-base lg:text-lg">{display}</span>
      </div>
    </button>
  );
}
