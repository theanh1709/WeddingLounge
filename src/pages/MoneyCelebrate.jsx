import { useEffect, useRef, useState } from 'react'

const MEDIA_BASE = import.meta.env.BASE_URL

const accounts = [
  {
    key: 'bride',
    label: 'Cô dâu',
    accountName: 'LE THUY TRANG',
    bank: 'VIETCOMBANK',
    accountNumber: '085100002O386',
    qrSrc: `${MEDIA_BASE}media/qr-bride.png`,
  },
  {
    key: 'groom',
    label: 'Chú rể',
    accountName: 'VU THE ANH',
    bank: 'MB BANK',
    accountNumber: '5510120066001',
    qrSrc: `${MEDIA_BASE}media/qr-groom.png`,
  },
]

export default function MoneyCelebrate() {
  const [copiedKey, setCopiedKey] = useState(null)
  const copyTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const copyAccountNumber = async (account) => {
    if (!account?.accountNumber) {
      return
    }
    const text = account.accountNumber
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const input = document.createElement('input')
        input.value = text
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        input.remove()
      }
      setCopiedKey(account.key)
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedKey(null)
      }, 1500)
    } catch {
      // Ignore clipboard errors on unsupported browsers.
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <h2>Mừng tiệc cưới cho cô dâu và chú rể</h2>
        <p>Quét QR hoặc chuyển khoản theo thông tin bên dưới.</p>
      </div>
      <div className="grid two-col money-grid">
        {accounts.map((account) => (
          <div key={account.key} className="card money-card">
            <div className="money-card-header">
              <h3>{account.label}</h3>
            </div>
            <img
              className="money-qr"
              src={account.qrSrc}
              alt={`QR ${account.label}`}
              loading="lazy"
            />
            <div className="money-info">
              <div className="money-row">
                <span className="money-label">Tên chủ tài khoản</span>
                <span className="money-value">{account.accountName}</span>
              </div>
              <div className="money-row">
                <span className="money-label">Ngân hàng</span>
                <span className="money-value">{account.bank}</span>
              </div>
              <div className="money-row">
                <span className="money-label">Số tài khoản</span>
                <div className="money-value-group">
                  <span className="money-value">{account.accountNumber}</span>
                  <button
                    type="button"
                    className="btn btn-outline money-copy"
                    onClick={() => copyAccountNumber(account)}
                  >
                    {copiedKey === account.key ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
