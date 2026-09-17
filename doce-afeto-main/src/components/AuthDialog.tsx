import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { api, queryClient } from '../api';
import { useUi } from '../store';
import type { User } from '../types';
import { Button, ErrorMessage, Field, Modal } from './ui';

const schema = z.object({ email: z.email('Informe um e-mail válido.'), password: z.string().min(10, 'Use pelo menos 10 caracteres.').max(128), name: z.string().max(80).optional() });
type Values = z.infer<typeof schema>;
export function AuthDialog() {
  const open = useUi(s => s.authOpen), setOpen = useUi(s => s.setAuthOpen);
  const [signup, setSignup] = useState(false), [error, setError] = useState<unknown>(null);
  const { register, handleSubmit, reset, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });
  async function submit(values: Values) {
    if (signup && (!values.name || values.name.trim().length < 2)) { setFieldError('name', { message: 'Informe seu nome.' }); return; }
    setError(null);
    try {
      const result = await api<{ user: User }>(`/auth/${signup ? 'signup' : 'login'}`, { method: 'POST', body: JSON.stringify(signup ? values : { email: values.email, password: values.password }) });
      queryClient.setQueryData(['me'], result);
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setOpen(false); reset(); toast.success(`Que bom ter você aqui, ${result.user.name.split(' ')[0]}!`);
    } catch (e) { setError(e); }
  }
  return <Modal open={open} onOpenChange={value => { setOpen(value); setError(null); reset(); }} title={signup ? 'Seu cantinho de afeto' : 'Bom te ver por aqui'} description="Entre para ver seus pedidos em qualquer dispositivo.">
    <div className="auth-mark"><Heart size={28} /></div>
    <form onSubmit={handleSubmit(submit)} className="form-stack">
      {signup && <Field label="Seu nome" error={errors.name?.message}><input autoComplete="name" {...register('name')} /></Field>}
      <Field label="E-mail" error={errors.email?.message}><input type="email" autoComplete="email" placeholder="voce@exemplo.com" {...register('email')} /></Field>
      <Field label="Senha" error={errors.password?.message} hint={signup ? 'Pelo menos 10 caracteres.' : undefined}><input type="password" autoComplete={signup ? 'new-password' : 'current-password'} {...register('password')} /></Field>
      {error != null && <ErrorMessage error={error} />}
      <Button loading={isSubmitting} type="submit" className="full"><LogIn size={18} />{signup ? 'Criar minha conta' : 'Entrar'}</Button>
      <p className="auth-switch">{signup ? 'Já tem uma conta?' : 'Primeira vez aqui?'} <button type="button" onClick={() => { setSignup(!signup); setError(null); reset(); }}>{signup ? 'Entrar' : 'Criar conta'}</button></p>
      <p className="fine-print">Você também pode comprar sem conta. Nesse caso, seus pedidos ficam acessíveis neste navegador por até 30 dias.</p>
    </form>
  </Modal>;
}
