type Props = {
  profileLabel: string
  onOpenProfile: () => void
}

export function Header({ profileLabel, onOpenProfile }: Props) {
  return (
    <header className="sp-header">
      <div className="sp-header__inner">
        <div className="sp-header__row">
          <div>
            <h1 className="sp-title">💎 SmartPharmacy</h1>
            <p className="sp-subtitle">مساعدك بعد الكشف: فهم الروشتة، بدائل، تحذيرات، وأقرب صيدلية</p>
          </div>
          <div className="sp-header__actions">
            <button className="sp-pill" onClick={onOpenProfile} type="button">{profileLabel}</button>
          </div>
        </div>
      </div>
    </header>
  );
}
