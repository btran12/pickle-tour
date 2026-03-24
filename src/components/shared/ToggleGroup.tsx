interface ToggleGroupProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export function ToggleGroup<T extends string>({ options, value, onChange }: ToggleGroupProps<T>) {
  return (
    <div className="toggle-group">
      {options.map(opt => (
        <button
          key={opt.value}
          className={value === opt.value ? 'active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
