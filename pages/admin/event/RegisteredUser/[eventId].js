import { useEffect, useState } from 'react';
import { db } from '../../../../firebaseConfig';
import { collection, getDocs, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/router';
import Layout from '../../../../component/Layout';
import "../../../../src/app/styles/main.scss";
import axios from 'axios';
import ExportToExcel from '../../../admin/ExporttoExcel';

const RegisteredUsers = () => {
  const router = useRouter();
  const { eventId } = router.query;
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');

  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [availableProducts, setAvailableProducts] = useState([]); // dynamic products

  // Admin form state
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [eventName, setEventName] = useState('');

  useEffect(() => {
    if (!eventId) return;


    const fetchEventProducts = async () => {
      try {
        const eventRef = doc(db, 'OREMeet', eventId);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
          const data = eventSnap.data();
          setAvailableProducts(Array.isArray(data.productList) ? data.productList : []);
          setEventName(data.name || 'ORE Meet'); // 👈 Add this line
        }
      } catch (err) {
        console.error('Error fetching event products:', err);
      }
    };

    const fetchRegisteredUsers = async () => {
      try {
        const registeredUsersCollection = collection(db, `OREMeet/${eventId}/registeredUsers`);
        const snapshot = await getDocs(registeredUsersCollection);

        const users = snapshot.docs.map((doc, index) => {
          const data = doc.data();
          return {
            id: doc.id,
            srNo: index + 1,
            name: data.name || 'N/A',
            phoneNumber: data.phoneNumber || 'N/A',
            email: data.email || 'N/A',
            location: data.location || 'N/A',
            selectedProducts: Array.isArray(data.selectedProducts) ? data.selectedProducts : [],
            registeredAt: data.registeredAt?.toDate().toLocaleString() || 'N/A',
          };

        });

        setRegisteredUsers(users);
      } catch (err) {
        console.error('Error fetching registered users:', err);
        setError('Failed to fetch users. Please try again.');
      }
    };

    fetchEventProducts();
    fetchRegisteredUsers();
  }, [eventId, success]);

  const handleProductChange = (product) => {
    setSelectedProducts((prev) =>
      prev.includes(product)
        ? prev.filter((p) => p !== product)
        : [...prev, product]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !phoneNumber || selectedProducts.length === 0) {
      setError('Please fill all fields and select at least one product.');
      return;
    }

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const userRef = doc(db, 'OREMeet', eventId, 'registeredUsers', phoneNumber);

      await setDoc(userRef, {
        name,
        phoneNumber,
        email,
        location,
        selectedProducts,
        registeredAt: Timestamp.now(),
      });


      setSuccess('User added successfully.');
      setName('');
      setPhoneNumber('');
      setSelectedProducts([]);

      // ✅ WhatsApp Message
      await axios.post(
        `https://graph.facebook.com/v19.0/712485631939049/messages`,
        {
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "template",
          template: {
            name: "oremeet_thankyoumessage",
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: name },
                  { type: "text", text: eventName || "ORE Meet" },
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

    } catch (err) {
      console.error("Submit or WhatsApp error:", err.response?.data || err.message);
      setError('Error submitting or sending message.');
    }
  };



  return (
    <Layout>
      <section className='c-userslist box'>
        <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <ExportToExcel eventId={eventId} />
          {/* <button className="m-button-5" onClick={() => window.history.back()}>Back</button> */}
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}
        <section className='c-form box'>
          <h2>Add New Lead</h2>


          {/* Admin Add Form */}
          <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
            <ul>
              <li className='form-row'>
                <h4>Person Name<sup>*</sup></h4>
                <div className='multipleitem'>

                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              </li>



              <li className='form-row'>
                <h4>Phone<sup>*</sup></h4>
                <div className='multipleitem'>

                  <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
                </div>
              </li>
              <li className='form-row'>
                <h4>Email<sup>*</sup></h4>
                <div className='multipleitem'>
                  <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </li>

              <li className='form-row'>
                <h4>Other Message<sup>*</sup></h4>
                <div className='multipleitem'>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required />
                </div>
              </li>

              <li className='form-row'>
                <h4>Select Products<sup>*</sup></h4>
                <div className='multipleitem'>


                  {availableProducts.length > 0 ? (
                    availableProducts.map((product) => (
                      <label key={product} style={{ marginRight: '10px' }}>
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product)}
                          onChange={() => handleProductChange(product)}
                        />
                        {product}
                      </label>
                    ))
                  ) : (
                    <p>No products available.</p>
                  )}
                </div>
              </li>


              <li className='form-row'>
                <div>
                  <button type="submit" className="submitbtn">Add User</button>

                </div>
              </li>
            </ul>
          </form>
        </section>
        {/* Registered Users Table */}
     <table className='table-class' style={{ marginTop: '2rem' }}>
  <thead>
    <tr>
      <th>Sr No</th>
      <th>Name</th>
      <th>Phone Number</th>
      <th>Email</th>
      <th>Type of Customer</th>
      <th>Company/Organization</th>
      <th>Message</th>
      <th>Selected Products</th>
      <th>Registered At</th>
    </tr>
  </thead>
  <tbody>
    {registeredUsers.length > 0 ? (
      registeredUsers.map((user, index) => (
        <tr key={user.id}>
          <td>{index + 1}</td>
          <td>{user.name || 'N/A'}</td>
          <td>{user.phoneNumber || 'N/A'}</td>
          <td>{user.email || 'N/A'}</td>
          <td>{user.customerType || 'N/A'}</td>
          <td>{user.organization || 'N/A'}</td>
          <td>{user.location || 'N/A'}</td>
          <td>{user.selectedProducts?.join(', ') || 'N/A'}</td>
          <td>
            {user.registeredAt?.toDate
              ? user.registeredAt.toDate().toLocaleString()
              : 'N/A'}
          </td>
        </tr>
      ))
    ) : (
      <tr>
        <td colSpan="9">No users registered for this event.</td>
      </tr>
    )}
  </tbody>
</table>

      </section>
    </Layout>
  );
};

export default RegisteredUsers;
