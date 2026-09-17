import * as Dialog from '@radix-ui/react-dialog';
import { AlertCircle, LoaderCircle, Minus, Plus, X, Heart } from 'lucide-react';
import { useId, useState, type ComponentProps, type ReactNode } from 'react';

export function Button({ children, variant = 'primary', loading, className = '', disabled, ...props }: ComponentProps<'button'> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean }) {
  return <button className={`button button-${variant} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>{loading && <LoaderCircle className="spin" size={18} aria-hidden="true" />}{children}</button>;
}
export function Modal({ open, onOpenChange, title, description, children, drawer = false, className = '' }: { open: boolean; onOpenChange: (value: boolean) => void; title: string; description: string; children: ReactNode; drawer?: boolean; className?: string }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="overlay" /><Dialog.Content className={`${drawer ? 'drawer' : 'modal'} ${className}`}>
    <div className="dialog-heading"><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Fechar janela"><X size={21} /></Dialog.Close></div>
    {children}
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export function Quantity({ value, max, onChange, label }: { value: number; max: number; onChange: (value: number) => void; label: string }) {
  return <div className="quantity" role="group" aria-label={`Quantidade de ${label}`}><button type="button" aria-label={`Diminuir ${label}`} disabled={value <= 1} onClick={() => onChange(value - 1)}><Minus size={16} /></button><span aria-live="polite">{value}</span><button type="button" aria-label={`Aumentar ${label}`} disabled={value >= Math.min(max, 50)} onClick={() => onChange(value + 1)}><Plus size={16} /></button></div>;
}
export function Field({ label, error, children, hint }: { label: string; error?: string; children: ReactNode; hint?: string }) {
  const id = useId();
  return <div className={`field ${error ? 'field-invalid' : ''}`}><label>{label}{children}</label>{hint && <small>{hint}</small>}{error && <span className="field-error" id={id} role="alert">{error}</span>}</div>;
}
export function ErrorMessage({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div className="error-message" role="alert"><AlertCircle size={19} aria-hidden="true" /><div><p>{error instanceof Error ? error.message : 'Algo não deu certo. Tente novamente.'}</p>{retry && <button onClick={retry}>Tentar novamente</button>}</div></div>;
}
export function ProductImage({ src, name, className = '', eager = false }: { src: string; name: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className={`image-fallback ${className}`} role="img" aria-label={name}><Heart size={40} /><span>Feito com carinho</span></div> : <img className={className} src={src} alt={name} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />;
}
export function EmptyState({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h2>{title}</h2><p>{text}</p>{children}</div>;
}
