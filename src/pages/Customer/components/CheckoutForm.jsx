// src/pages/Customer/components/CheckoutForm.jsx

export default function CheckoutForm({
  house,
  setHouse,
  apartment,
  setApartment,
  floor,
  setFloor,
  phone,
  setPhone,
  notes,
  setNotes
}) {
  return (
    <>
      {/* Detailed Address Grid */}
      <div className="checkout-grid-3col">
        <div>
          <label className="form-label">Дом/Корпус</label>
          <input 
            type="text"
            value={house}
            onChange={(e) => setHouse(e.target.value)}
            placeholder="дом 12"
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Квартира</label>
          <input 
            type="text"
            value={apartment}
            onChange={(e) => setApartment(e.target.value)}
            placeholder="кв 45"
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Этаж</label>
          <input 
            type="text"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="3 этаж"
            className="form-input"
          />
        </div>
      </div>

      {/* Phone & Notes */}
      <div className="checkout-grid-row">
        <div>
          <label className="form-label" htmlFor="recipient-phone">📞 Телефон получателя *</label>
          <input 
            id="recipient-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+48 123 456 789"
            required
            autoComplete="tel"
            spellCheck={false}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="recipient-notes">📝 Заметка курьеру</label>
          <textarea 
            id="recipient-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Например: Оставить у двери, домофон не работает…"
            className="form-textarea"
          />
        </div>
      </div>
    </>
  );
}
