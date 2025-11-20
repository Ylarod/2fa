import { useState, useEffect, useCallback } from 'react'
import { Copy, Link, RefreshCw, AlertCircle, Check } from 'lucide-react'
import { generateTOTP, normalizeSecret } from './utils/totp'

function App() {
    const [secret, setSecret] = useState('')
    const [code, setCode] = useState('------')
    const [timeLeft, setTimeLeft] = useState(30)
    const [error, setError] = useState<string | null>(null)
    const [isCopied, setIsCopied] = useState(false)
    const [isLinkCopied, setIsLinkCopied] = useState(false)
    const [isActive, setIsActive] = useState(false)

    // Handle URL hash
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash
            if (hash && hash.startsWith('#secret=')) {
                const newSecret = decodeURIComponent(hash.substring(8))
                setSecret(newSecret)
                if (newSecret) {
                    setIsActive(true)
                }
            }
        }

        handleHashChange()
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    // Update TOTP code
    const updateCode = useCallback(async () => {
        if (!secret) return

        try {
            const newCode = await generateTOTP(secret)
            setCode(newCode)
            setError(null)

            const epoch = Math.floor(Date.now() / 1000)
            const remaining = 30 - (epoch % 30)
            setTimeLeft(remaining)
        } catch (err) {
            setError((err as Error).message)
            setIsActive(false)
        }
    }, [secret])

    useEffect(() => {
        let interval: any

        if (isActive && secret) {
            updateCode()
            interval = setInterval(updateCode, 1000)
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isActive, secret, updateCode])

    const handleGenerate = () => {
        if (!secret.trim()) {
            setError('请输入 Secret Key')
            return
        }
        window.location.hash = '#secret=' + encodeURIComponent(secret.trim())
        setIsActive(true)
    }

    const handleCopyCode = async () => {
        if (code === '------') return
        await navigator.clipboard.writeText(code)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    const handleCopyLink = async () => {
        if (!secret) return
        try {
            const normalizedSecret = normalizeSecret(secret)
            const url = window.location.origin + window.location.pathname + '#secret=' + encodeURIComponent(normalizedSecret)
            await navigator.clipboard.writeText(url)
            setIsLinkCopied(true)
            setTimeout(() => setIsLinkCopied(false), 2000)
        } catch (err) {
            setError('无法生成链接：Secret 格式无效')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleGenerate()
        }
    }

    return (
        <div className="glass-panel">
            <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 600 }}>
                🔐 2FA 验证码生成器
            </h1>

            {isActive && !error && (
                <div className="code-display">
                    <div className="code-value">{code}</div>
                    <div className="timer-bar">
                        <div
                            className="timer-fill"
                            style={{ width: `${(timeLeft / 30) * 100}%` }}
                        />
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.7 }}>
                        {timeLeft}秒后刷新
                    </div>

                    <div className="action-buttons">
                        <button
                            className={`btn ${isCopied ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={handleCopyCode}
                        >
                            {isCopied ? <Check size={18} /> : <Copy size={18} />}
                            {isCopied ? '已复制' : '复制代码'}
                        </button>
                        <button
                            className={`btn ${isLinkCopied ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={handleCopyLink}
                        >
                            {isLinkCopied ? <Check size={18} /> : <Link size={18} />}
                            {isLinkCopied ? '已复制' : '复制链接'}
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="error-msg">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            <div className="input-group">
                <input
                    type="text"
                    className="glass-input"
                    placeholder="输入 Secret Key（支持各种格式）"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>

            <button className="btn btn-primary" onClick={handleGenerate}>
                <RefreshCw size={20} />
                生成验证码
            </button>

            <div style={{ marginTop: '2rem', fontSize: '0.85rem', opacity: 0.6, lineHeight: '1.6' }}>
                <strong>使用方式：</strong><br />
                1. 在URL中添加 #secret=YOUR_SECRET<br />
                2. 或在上方输入框手动输入 Secret Key<br />
                支持各种格式的 Secret（带空格、连字符等）
            </div>
        </div>
    )
}

export default App
