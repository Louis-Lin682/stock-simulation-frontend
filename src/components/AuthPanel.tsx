import type { FormEvent } from 'react'
import type { AuthMode } from '../types'
import { LoadingRing } from './LoadingRing'

type AuthPanelProps = {
  authModeLabel: string
  email: string
  isLoading: boolean
  isModal?: boolean
  message: string
  mode: AuthMode
  onClose?: () => void
  password: string
  progress: number
  switchLabel: string
  onEmailChange: (value: string) => void
  onModeChange: (mode: AuthMode) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function AuthPanel({
  authModeLabel,
  email,
  isLoading,
  isModal = false,
  message,
  mode,
  onClose,
  password,
  progress,
  switchLabel,
  onEmailChange,
  onModeChange,
  onPasswordChange,
  onSubmit,
}: AuthPanelProps) {
  return (
    <section className={`auth-panel${isModal ? ' is-modal' : ''}`} aria-label="登入或註冊">
      {isModal && onClose && (
        <button
          aria-label="關閉登入視窗"
          className="auth-panel-close"
          type="button"
          onClick={onClose}
        >
          ×
        </button>
      )}

      <div className="brand-mark">
        <span>TW</span>
        <strong>SIM</strong>
      </div>

      <p className="eyebrow">真實行情與模擬交易系統</p>
      <h1>{mode === 'login' ? '歡迎回來' : '建立帳戶'}</h1>

      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          <span>Email 帳號</span>
          <input
            autoComplete="email"
            inputMode="email"
            name="email"
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="example@mail.com"
            type="email"
            value={email}
          />
        </label>

        <label>
          <span>密碼</span>
          <input
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            name="password"
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="至少 8 碼"
            type="password"
            value={password}
          />
        </label>

        <div className="form-row">
          <button className="link-button" type="button">
            忘記密碼？
          </button>
        </div>

        <button className="primary-button" disabled={isLoading} type="submit">
          {isLoading ? <LoadingRing label="處理中" progress={progress} size="sm" /> : authModeLabel}
        </button>
      </form>

      <div className="mode-switch">
        <button type="button" onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}>
          {switchLabel}
        </button>
      </div>

      {message && <p className="status-message">{message}</p>}
    </section>
  )
}
