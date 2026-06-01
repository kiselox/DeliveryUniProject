
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
      {}
      <div className="checkout-grid-3col">
        <div>
          <label className="form-label">House/Building</label>
          <input 
            type="text"
            value={house}
            onChange={(e) => setHouse(e.target.value)}
            placeholder="House 12"
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Apartment</label>
          <input 
            type="text"
            value={apartment}
            onChange={(e) => setApartment(e.target.value)}
            placeholder="Apt 45"
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Floor</label>
          <input 
            type="text"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="3rd floor"
            className="form-input"
          />
        </div>
      </div>

      {}
      <div className="checkout-grid-row">
        <div>
          <label className="form-label" htmlFor="recipient-phone">📞 Recipient's Phone *</label>
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
          <label className="form-label" htmlFor="recipient-notes">📝 Note to Courier</label>
          <textarea 
            id="recipient-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Leave at the door, intercom doesn't work..."
            className="form-textarea"
          />
        </div>
      </div>
    </>
  );
}
