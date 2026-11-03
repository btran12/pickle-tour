interface ToggleGroupProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

export function ToggleGroup<T extends string>({ options, value, onChange, disabled }: ToggleGroupProps<T>) {
  return (
    <div className={`toggle-group ${disabled ? 'disabled' : ''}`}>
      {options.map(opt => (
        <button
          key={opt.value}
          className={value === opt.value ? 'active' : ''}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
