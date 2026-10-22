import { useId, useState, type FormEvent } from 'react'
import parkingLogo from '../assets/parking-logo.svg'
import {
  loginLocalOwner,
  registerLocalOwner,
} from '../persistence/localOwnerAuthStorage.ts'
import type { OwnerFacilityType } from '../types/ownerFacility.ts'
import { OWNER_FACILITY_TYPE_LABELS } from '../types/ownerFacility.ts'

const AUTH_HERO_PHOTO = '/auth/parking-garage-hero.jpg'

type AuthMode = 'login' | 'register'

type OperatorAuthPageProps = {
  lotName: string
  onAuthenticated: () => void
}

export default function OperatorAuthPage({
  lotName,
  onAuthenticated,
}: OperatorAuthPageProps) {
  const formId = useId()
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [facilityName, setFacilityName] = useState('')
  const [facilityType, setFacilityType] = useState<OwnerFacilityType>('other')
  const [facilityAddress, setFacilityAddress] = useState('')
  const [facilityCity, setFacilityCity] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [heroPhotoAvailable, setHeroPhotoAvailable] = useState(true)

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)
    const result = await loginLocalOwner({ username, password })
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onAuthenticated()
  }

  async function handleRegister(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const result = await registerLocalOwner({
      username,
      password,
      confirmPassword,
      facility: {
        name: facilityName,
        facilityType,
        address: facilityAddress,
        city: facilityCity,
      },
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    const registeredUsername = result.username
    setPassword('')
    setConfirmPassword('')
    setFacilityName('')
    setFacilityType('other')
    setFacilityAddress('')
    setFacilityCity('')
    setUsername(registeredUsername)
    setMode('login')
    setSuccessMessage(
      'Account created. Sign in with your username and password.',
    )
  }

  return (
    <div
      className={`auth-page${heroPhotoAvailable ? '' : ' auth-page--photo-fallback'}`}
    >
      <div className="auth-split">
        <aside className="auth-visual" aria-labelledby="auth-brand-heading">
          {heroPhotoAvailable ? (
            <img
              className="auth-visual__photo"
              src={AUTH_HERO_PHOTO}
              alt=""
              aria-hidden="true"
              loading="eager"
              decoding="async"
              onError={() => setHeroPhotoAvailable(false)}
            />
          ) : null}
          <div className="auth-visual__scrim" aria-hidden="true" />
          <div className="auth-visual__brand">
            <img
              src={parkingLogo}
              className="auth-visual__logo"
              alt=""
              aria-hidden="true"
              width={52}
              height={52}
            />
            <p className="auth-visual__eyebrow">Operator access</p>
            <h1 id="auth-brand-heading" className="auth-visual__title">
              PARKINGDEMO
            </h1>
            <p className="auth-visual__tagline">
              Smarter Parking. Smoother Operations.
            </p>
            {lotName ? (
              <p className="auth-visual__lot-hint">
                Demo lot context: <span>{lotName}</span>
              </p>
            ) : null}
            <p className="auth-visual__disclaimer" role="note">
              Local demo sign-in only — not production-secure. Vehicle owners use
              registration numbers at entry, not accounts.
            </p>
          </div>
        </aside>

        <main className="auth-panel">
          <section className="auth-card" aria-labelledby="auth-form-heading">
            <div
              className="auth-mode-tabs"
              role="tablist"
              aria-label="Authentication mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                className={`auth-mode-tab${mode === 'login' ? ' is-active' : ''}`}
                onClick={() => {
                  setMode('login')
                  setError(null)
                  setSuccessMessage(null)
                }}
              >
                Log in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                className={`auth-mode-tab${mode === 'register' ? ' is-active' : ''}`}
                onClick={() => {
                  setMode('register')
                  setError(null)
                  setSuccessMessage(null)
                }}
              >
                Register
              </button>
            </div>

            <h2 id="auth-form-heading" className="auth-card__title">
              {mode === 'login' ? 'Welcome back' : 'Create your operator account'}
            </h2>
            <p className="auth-card__lead">
              {mode === 'login'
                ? 'Sign in with your username and password.'
                : 'Set credentials and your first parking facility.'}
            </p>

            {mode === 'login' ? (
              <form className="login-form auth-form" onSubmit={handleLogin} noValidate>
                {successMessage ? (
                  <p className="form-message form-message--success" role="status">
                    {successMessage}
                  </p>
                ) : null}
                <UsernameField
                  id={`${formId}-login-user`}
                  value={username}
                  onChange={setUsername}
                />
                <PasswordField
                  id={`${formId}-login-pass`}
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggleShow={() => setShowPassword((visible) => !visible)}
                />
                {error ? (
                  <p className="form-message form-message--error" role="alert">
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="entry-submit login-submit auth-submit"
                  disabled={loading}
                >
                  {loading ? 'Signing in…' : 'Sign in to dashboard'}
                </button>
              </form>
            ) : (
              <form
                className="login-form auth-form auth-form--register"
                onSubmit={handleRegister}
                noValidate
              >
                <UsernameField
                  id={`${formId}-reg-user`}
                  value={username}
                  onChange={setUsername}
                  hint="3–32 characters: letters, numbers, underscore."
                />
                <PasswordField
                  id={`${formId}-reg-pass`}
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggleShow={() => setShowPassword((visible) => !visible)}
                  hint="At least 6 characters."
                />
                <PasswordField
                  id={`${formId}-reg-confirm`}
                  label="Confirm password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showPassword}
                  onToggleShow={() => setShowPassword((visible) => !visible)}
                />
                <div className="login-form-section-label">Parking location</div>
                <div className="field">
                  <label htmlFor={`${formId}-facility-name`}>Facility name</label>
                  <input
                    id={`${formId}-facility-name`}
                    value={facilityName}
                    onChange={(event) => setFacilityName(event.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${formId}-facility-type`}>Facility type</label>
                  <select
                    id={`${formId}-facility-type`}
                    value={facilityType}
                    onChange={(event) =>
                      setFacilityType(event.target.value as OwnerFacilityType)
                    }
                  >
                    {(Object.keys(OWNER_FACILITY_TYPE_LABELS) as OwnerFacilityType[]).map(
                      (type) => (
                        <option key={type} value={type}>
                          {OWNER_FACILITY_TYPE_LABELS[type]}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`${formId}-facility-address`}>Address</label>
                  <input
                    id={`${formId}-facility-address`}
                    value={facilityAddress}
                    onChange={(event) => setFacilityAddress(event.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${formId}-facility-city`}>City</label>
                  <input
                    id={`${formId}-facility-city`}
                    value={facilityCity}
                    onChange={(event) => setFacilityCity(event.target.value)}
                    required
                  />
                </div>
                {error ? (
                  <p className="form-message form-message--error" role="alert">
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="entry-submit login-submit auth-submit"
                  disabled={loading}
                >
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </form>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

function UsernameField({
  id,
  value,
  onChange,
  hint,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  hint?: string
}) {
  return (
    <div className="field auth-field">
      <label htmlFor={id}>Username</label>
      <input
        id={id}
        name="username"
        type="text"
        autoComplete="username"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggleShow: () => void
  hint?: string
}) {
  return (
    <div className="field auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="login-password-wrap">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={
            label.toLowerCase().includes('confirm') ? 'new-password' : 'current-password'
          }
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        <button
          type="button"
          className="login-password-toggle auth-password-toggle"
          onClick={onToggleShow}
          aria-pressed={show}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  )
}
