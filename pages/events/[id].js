import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { db } from '../../firebaseConfig';
import axios from 'axios';
import { doc, getDoc, collection, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import '../feedback.css';

const EventLoginPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [rating, setRating] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [eventDetails, setEventDetails] = useState(null);
  const [registeredUserCount, setRegisteredUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [organization, setOrganization] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEventEnded = eventDetails?.endTime?.seconds * 1000 < Date.now();

  useEffect(() => {
    if (id) {
      fetchEventDetails();
      fetchRegisteredUserCount();
    }
  }, [id]);

  const fetchEventDetails = async () => {
    const eventRef = doc(db, 'OREMeet', id);
    const eventDoc = await getDoc(eventRef);
    if (eventDoc.exists()) {
      setEventDetails(eventDoc.data());
    }
    setLoading(false);
  };

  const fetchRegisteredUserCount = async () => {
    const registeredUsersRef = collection(db, 'OREMeet', id, 'registeredUsers');
    const snapshot = await getDocs(registeredUsersRef);
    setRegisteredUserCount(snapshot.size);
  };

  const handleProductSelection = (product) => {
    setSelectedProducts(prev =>
      prev.includes(product)
        ? prev.filter(p => p !== product)
        : [...prev, product]
    );
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const base64String = canvas.toDataURL('image/jpeg', 0.7);

        // Optional: Check if base64 size is too large
        if (base64String.length > 1000000) {
          setError('Image too large after compression. Try a smaller image.');
          return;
        }

        setImageBase64(base64String);
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const userRef = doc(db, 'OREMeet', id, 'registeredUsers', phoneNumber || `user_${Date.now()}`);
      await setDoc(userRef, {
        name: userName,
        phoneNumber,
        email,
        location,
        selectedProducts,
        rating,
        customerType,
        organization,
        imageBase64,
        registeredAt: Timestamp.now(),
      });

      setSuccess('Thank you! Your response has been recorded.');

      // Clear all fields
      setUserName('');
      setPhoneNumber('');
      setEmail('');
      setLocation('');
      setSelectedProducts([]);
      setRating(0);
      setImageBase64('');
      setCustomerType('');
      setOrganization('');
      fetchRegisteredUserCount();

      // Optional: Send WhatsApp message only if phone number is provided
      if (phoneNumber) {
        await axios.post(
          `https://graph.facebook.com/v19.0/712485631939049/messages`,
          {
            messaging_product: "whatsapp",
            to: phoneNumber,
            type: "template",
            template: {
              name: "oremeet_thankyoumessage",
              language: { code: "en" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: userName || "Guest" },
                    { type: "text", text: eventDetails?.name || "the event" },
                    { type: "text", text: selectedProducts.join(', ') || "None" }
                  ]
                }
              ]
            }
          },
          {
            headers: {
              Authorization: `Bearer EAAKEGfZAV7pMBOzNQwpceyybpc3VaOZBcFMGkofz4h4ZAwUMAeouY8Q9ZB6DMyP471Sgk1kZCwv8ssqFlNICqDM9uEElrR8y6saxfXRejnduTB6LzVb0of2fZAzZB53FBv4eJTXABR0zzBHRcjtdTLjJc9pqbZBuVkc9grNOIkRYZA1gNq2hcqgWscUqDBiZCIOGfdYQZDZD `,
              "Content-Type": "application/json"
            }
          }
        );
      }

    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error?.message || err.message || 'Error submitting form.';
      setError(`Submission failed: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <p>Loading event details...</p>;
  }

  return (
    <section className="feedbackContainer">
      <div className="feedback-form-container">
        <div className="client_logo">
          <img src="/mantra_logo.png" alt="Logo" />
        </div>
        <h2 className="feedback-form-title">{eventDetails?.name || 'Event'}</h2>

        <form onSubmit={handleSubmit}>
          {/* Type of Customer */}
          <div className="input-group">
            <label>Type of Customer</label>
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
              disabled={isEventEnded}
            >
              <option value="">Select Type</option>
              <option value="Retail">Retail</option>
              <option value="Corporate">Corporate</option>
              <option value="Individual">Individual</option>
            </select>
          </div>


          {/* Image Upload */}
          <div className="input-group">
            <label>Capture / Upload Photo</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              disabled={isEventEnded}
            />
            {imageBase64 && (
              <img
                src={imageBase64}
                alt="Preview"
                style={{ width: '100px', marginTop: '10px', borderRadius: '8px' }}
              />
            )}
          </div>

          {/* Mobile Number */}
          <div className="input-group">
            <label>Mobile Number</label>
            <input
              type="text"
              name="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isEventEnded}
            />
          </div>

          {/* Select Products */}
          <div className="input-group">
            <label>Select Products</label>
            <div className="checkbox-group">
              {eventDetails?.productList?.length > 0 ? (
                eventDetails.productList.map((product, idx) => (
                  <div className="checkbox-item" key={idx}>
                    <input
                      type="checkbox"
                      id={`product-${idx}`}
                      value={product}
                      checked={selectedProducts.includes(product)}
                      onChange={() => handleProductSelection(product)}
                      disabled={isEventEnded}
                    />
                    <label htmlFor={`product-${idx}`}>{product}</label>
                  </div>
                ))
              ) : (
                <p>No products listed for this event.</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEventEnded}
            />
          </div>

          {/* Organization */}
          <div className="input-group">
            <label>Company / Organization Name</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              disabled={isEventEnded}
            />
          </div>

          {/* Full Name */}
          <div className="input-group">
            <label>Name of Customer</label>
            <input
              type="text"
              name="fullName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={isEventEnded}
            />
          </div>

          {/* Feedback */}
          <div className="input-group">
            <label>Message / Quality</label>
            <textarea
              name="Message"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isEventEnded}
            ></textarea>
          </div>

          

          {/* Rating */}
          <div className="input-group">
            <label>Rate the Customer (1 to 5)</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${rating >= star ? 'filled' : ''}`}
                  onClick={() => !isEventEnded && setRating(star)}
                  style={{
                    cursor: isEventEnded ? 'not-allowed' : 'pointer',
                    fontSize: '24px',
                    color: rating >= star ? '#f39c12' : '#ccc',
                  }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <button className="submitbtns" type="submit" disabled={isEventEnded || isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>

          {isEventEnded && <p style={{ color: 'gray' }}>Registration is closed. The event has ended.</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {success && <p style={{ color: 'green' }}>{success}</p>}
        </form>
      </div>
    </section>
  );
};

export default EventLoginPage;
