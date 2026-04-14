import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const AdminStaffManagementPage = () => {
  const navigate = useNavigate();
  const [adminSession, setAdminSession] = useState(null);
  const [activeTab, setActiveTab] = useState('create');

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE STAFF SECTION
  // ─────────────────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    warehouse_id: 1,
    role: 'WAREHOUSE_STAFF'
  });

  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // EXISTING STAFF SECTION
  // ─────────────────────────────────────────────────────────────────────────
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');

  useEffect(() => {
    // Check admin session
    const session = sessionStorage.getItem('adminSession');
    if (!session) {
      navigate('/auth');
      return;
    }
    setAdminSession(JSON.parse(session));

    // Load existing staff
    loadStaffList();
  }, [navigate]);

  const loadStaffList = async () => {
    try {
      setStaffLoading(true);
      const response = await api.get('/warehouse/staff/list', {
        params: { warehouse_id: 1 }
      });

      if (response.data.success) {
        setStaffList(response.data.staff || []);
      }
    } catch (error) {
      console.error('Failed to load staff list:', error);
      setStaffError('Failed to load staff list');
    } finally {
      setStaffLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreatedCredentials(null);

    if (!formData.name || !formData.email || !formData.mobile) {
      setCreateError('Please fill all required fields');
      return;
    }

    try {
      setCreateLoading(true);
      const response = await api.post('/warehouse/staff/create', formData);

      if (response.data.success) {
        // Display credentials
        setCreatedCredentials({
          staff_id: response.data.staff_id,
          email: response.data.email,
          password: response.data.password,
          name: response.data.name,
          mobile: response.data.mobile,
          role: response.data.role
        });

        setCreateSuccess('Staff account created successfully!');

        // Clear form
        setFormData({
          name: '',
          email: '',
          mobile: '',
          warehouse_id: 1,
          role: 'WAREHOUSE_STAFF'
        });

        // Reload staff list
        setTimeout(() => loadStaffList(), 1000);
      }
    } catch (error) {
      console.error('Create staff error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to create staff account';
      setCreateError(errorMsg);
    } finally {
      setCreateLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CREDENTIAL COPY & PRINT FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────
  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    alert(`${field} copied to clipboard!`);
  };

  const printCredentials = () => {
    if (!createdCredentials) return;

    const printWindow = window.open('', '', 'height=500,width=600');
    const htmlContent = `
      <html>
        <head>
          <title>Warehouse Staff Credentials</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; border: 2px solid #333; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #333; }
            .header p { margin: 5px 0; color: #666; }
            .credentials { margin: 20px 0; }
            .credential-item { margin: 15px 0; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }
            .label { font-weight: bold; color: #333; }
            .value { font-family: monospace; color: #000; margin-top: 5px; padding: 8px; background-color: #fff; border: 1px solid #ddd; border-radius: 3px; }
            .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏭 Ekart Warehouse</h1>
              <p>Staff Account Credentials</p>
              <p>Generated: ${new Date().toLocaleString()}</p>
            </div>

            <div class="credentials">
              <div class="credential-item">
                <div class="label">Staff Name:</div>
                <div class="value">${createdCredentials.name}</div>
              </div>

              <div class="credential-item">
                <div class="label">Staff ID:</div>
                <div class="value">${createdCredentials.staff_id}</div>
              </div>

              <div class="credential-item">
                <div class="label">Email:</div>
                <div class="value">${createdCredentials.email}</div>
              </div>

              <div class="credential-item">
                <div class="label">Password:</div>
                <div class="value">${createdCredentials.password}</div>
              </div>

              <div class="credential-item">
                <div class="label">Mobile:</div>
                <div class="value">${createdCredentials.mobile}</div>
              </div>

              <div class="credential-item">
                <div class="label">Role:</div>
                <div class="value">${createdCredentials.role}</div>
              </div>
            </div>

            <div class="warning">
              <strong>⚠️ Important:</strong><br>
              • Keep this document in a safe place<br>
              • Share credentials with staff securely<br>
              • Instruct staff to change password on first login<br>
              • Do not share credentials through unsecured channels
            </div>

            <div class="footer">
              <p>© 2024 Ekart E-Commerce Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const sendCredentialsEmail = async () => {
    if (!createdCredentials) return;

    const emailBody = `
Staff Account Credentials

Name: ${createdCredentials.name}
Staff ID: ${createdCredentials.staff_id}
Email: ${createdCredentials.email}
Password: ${createdCredentials.password}
Mobile: ${createdCredentials.mobile}
Role: ${createdCredentials.role}

Login URL: http://localhost:3000/warehouse/login

Important:
- Change your password on first login
- Keep this information secure
- Do not share with anyone
`;

    // Open default email client
    window.location.href = `mailto:${createdCredentials.email}?subject=Your Warehouse Staff Account Credentials&body=${encodeURIComponent(emailBody)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Warehouse Staff Management</h1>
              <p className="text-gray-600 mt-2">Create and manage warehouse staff accounts</p>
            </div>
            <button
              onClick={() => navigate('/admin/home')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              ← Back to Admin
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('create')}
              className={`py-4 px-2 font-semibold border-b-2 ${
                activeTab === 'create'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Create Staff
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`py-4 px-2 font-semibold border-b-2 ${
                activeTab === 'list'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Existing Staff
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* CREATE STAFF TAB */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <div>
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Staff</h2>

                {createError && (
                  <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    {createError}
                  </div>
                )}

                <form onSubmit={handleCreateStaff} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Staff Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="e.g., John Doe"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      placeholder="e.g., staff@warehouse.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleFormChange}
                      placeholder="e.g., 9876543210"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Warehouse
                    </label>
                    <select
                      name="warehouse_id"
                      value={formData.warehouse_id}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1">Warehouse - Bengaluru</option>
                      <option value="2">Warehouse - Delhi</option>
                      <option value="3">Warehouse - Mumbai</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
                      <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={createLoading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {createLoading ? 'Creating...' : 'Create Staff'}
                  </button>
                </form>
              </div>
            </div>

            {/* Credentials Display */}
            {createdCredentials && (
              <div>
                <div className="bg-green-50 border-2 border-green-500 rounded-lg shadow p-6">
                  <div className="flex items-center mb-6">
                    <div className="bg-green-500 text-white rounded-full w-12 h-12 flex items-center justify-center mr-4">
                      ✓
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-green-700">Success!</h3>
                      <p className="text-green-600">Staff account created successfully</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="text-sm text-gray-500 mb-1">Staff Name</div>
                      <div className="font-semibold text-gray-900">{createdCredentials.name}</div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Staff ID</div>
                          <div className="font-semibold text-gray-900 font-mono">{createdCredentials.staff_id}</div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(createdCredentials.staff_id, 'Staff ID')}
                          className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm hover:bg-blue-200"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Email</div>
                          <div className="font-semibold text-gray-900 font-mono break-all">{createdCredentials.email}</div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(createdCredentials.email, 'Email')}
                          className="px-3 py-1 bg-blue-100 text-blue-600 rounded text-sm hover:bg-blue-200"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-300">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm text-yellow-700 mb-1">Password</div>
                          <div className="font-semibold text-gray-900 font-mono break-all">{createdCredentials.password}</div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(createdCredentials.password, 'Password')}
                          className="px-3 py-1 bg-yellow-100 text-yellow-600 rounded text-sm hover:bg-yellow-200"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="text-sm text-gray-500 mb-1">Mobile</div>
                      <div className="font-semibold text-gray-900">{createdCredentials.mobile}</div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="text-sm text-gray-500 mb-1">Role</div>
                      <div className="font-semibold text-gray-900">{createdCredentials.role}</div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> Credentials have been sent to the staff email address. Keep them safe!
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={printCredentials}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      🖨️ Print Credentials
                    </button>
                    <button
                      onClick={sendCredentialsEmail}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      📧 Send via Email
                    </button>
                    <button
                      onClick={() => setCreatedCredentials(null)}
                      className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400"
                    >
                      Create Another
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EXISTING STAFF TAB */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Existing Staff</h2>
            </div>

            {staffError && (
              <div className="p-6 text-center text-red-600">
                {staffError}
              </div>
            )}

            {staffLoading && (
              <div className="p-6 text-center text-gray-600">
                Loading staff list...
              </div>
            )}

            {!staffLoading && staffList.length === 0 && (
              <div className="p-6 text-center text-gray-600">
                No staff members found
              </div>
            )}

            {!staffLoading && staffList.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold text-gray-700">Name</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-700">Email</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-700">Mobile</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-700">Role</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-700">Status</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-700">Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map(staff => (
                      <tr key={staff.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{staff.name}</td>
                        <td className="px-6 py-4 text-gray-600">{staff.email}</td>
                        <td className="px-6 py-4 text-gray-600">{staff.mobile}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {staff.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {staff.active ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                              Active
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{staff.last_login}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStaffManagementPage;
