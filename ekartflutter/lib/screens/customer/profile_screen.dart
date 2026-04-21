import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/services.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? profile;
  bool loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => loading = true);
    final res = await ProfileService.getProfile();
    if (!mounted) return;
    setState(() {
      profile = res['success'] == true ? res['profile'] : null;
      loading = false;
    });
  }

  void _showEditProfile() {
    final nameCtrl   = TextEditingController(text: profile?['name'] ?? '');
    final mobileCtrl = TextEditingController(text: '${profile?['mobile'] ?? ''}');
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Edit Profile',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          TextField(
            controller: nameCtrl,
            decoration: const InputDecoration(labelText: 'Name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: mobileCtrl,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
            decoration: const InputDecoration(labelText: 'Mobile'),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                final res = await ProfileService.updateProfile({
                  'name': nameCtrl.text.trim(),
                  'mobile': mobileCtrl.text.trim(),
                });
                if (!mounted) return;
                _snack(res['message'] ?? (res['success'] == true ? 'Updated!' : 'Failed'),
                    res['success'] == true ? Colors.green : Colors.red);
                if (res['success'] == true) _load();
              },
              style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue.shade700,
                  foregroundColor: Colors.white),
              child: const Text('Save Changes'),
            ),
          ),
        ]),
      ),
    );
  }

  void _showAddAddress() {
    final nameCtrl   = TextEditingController();
    final streetCtrl = TextEditingController();
    final cityCtrl   = TextEditingController();
    final stateCtrl  = TextEditingController();
    final pinCtrl    = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('Add Address',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            _field(nameCtrl,   'Recipient Name'),
            const SizedBox(height: 10),
            _field(streetCtrl, 'House / Street'),
            const SizedBox(height: 10),
            _field(cityCtrl,   'City'),
            const SizedBox(height: 10),
            _field(stateCtrl,  'State'),
            const SizedBox(height: 10),
            TextField(
              controller: pinCtrl,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
              decoration: const InputDecoration(labelText: 'PIN Code'),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  if (nameCtrl.text.trim().isEmpty || cityCtrl.text.trim().isEmpty) {
                    _snack('Please fill all required fields', Colors.red);
                    return;
                  }
                  Navigator.pop(context);
                  final res = await ProfileService.addAddress({
                    'recipientName': nameCtrl.text.trim(),
                    'houseStreet':   streetCtrl.text.trim(),
                    'city':          cityCtrl.text.trim(),
                    'state':         stateCtrl.text.trim(),
                    'postalCode':    pinCtrl.text.trim(),
                  });
                  if (!mounted) return;
                  _snack(res['message'] ?? (res['success'] == true ? 'Address added!' : 'Failed'),
                      res['success'] == true ? Colors.green : Colors.red);
                  if (res['success'] == true) _load();
                },
                style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue.shade700,
                    foregroundColor: Colors.white),
                child: const Text('Save Address'),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  void _showChangePassword() {
    final currentCtrl = TextEditingController();
    final newCtrl     = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Change Password',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          TextField(
            controller: currentCtrl,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Current Password'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: newCtrl,
            obscureText: true,
            decoration: const InputDecoration(
                labelText: 'New Password',
                helperText: 'Min 8 chars, uppercase, number & special char'),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                final res = await ProfileService.changePassword(
                    currentCtrl.text, newCtrl.text);
                if (!mounted) return;
                _snack(res['message'] ?? (res['success'] == true ? 'Password changed!' : 'Failed'),
                    res['success'] == true ? Colors.green : Colors.red);
              },
              style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue.shade700,
                  foregroundColor: Colors.white),
              child: const Text('Update Password'),
            ),
          ),
        ]),
      ),
    );
  }

  void _snack(String msg, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
              icon: const Icon(Icons.edit),
              onPressed: profile != null ? _showEditProfile : null),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : profile == null
              ? const Center(child: Text('Failed to load profile'))
              : ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    // Avatar
                    Center(
                      child: CircleAvatar(
                        radius: 48,
                        backgroundColor: Colors.blue.shade100,
                        child: Text(
                          (profile!['name'] ?? 'U').isNotEmpty
                              ? (profile!['name'] as String)[0].toUpperCase()
                              : 'U',
                          style: TextStyle(
                              fontSize: 40,
                              fontWeight: FontWeight.bold,
                              color: Colors.blue.shade700),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Center(
                      child: Text(profile!['name'] ?? '',
                          style: const TextStyle(
                              fontSize: 22, fontWeight: FontWeight.bold)),
                    ),
                    Center(
                      child: Text(profile!['email'] ?? '',
                          style: TextStyle(color: Colors.grey[600])),
                    ),
                    Center(
                      child: Text('📱 ${profile!['mobile'] ?? ''}',
                          style: TextStyle(color: Colors.grey[600])),
                    ),

                    const SizedBox(height: 28),

                    // Addresses
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Saved Addresses',
                            style: TextStyle(
                                fontSize: 16, fontWeight: FontWeight.bold)),
                        TextButton.icon(
                          onPressed: _showAddAddress,
                          icon: const Icon(Icons.add, size: 16),
                          label: const Text('Add'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ...((profile!['addresses'] as List? ?? [])
                        .map((a) => _buildAddressCard(a))),
                    if ((profile!['addresses'] as List? ?? []).isEmpty)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.grey[50],
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.grey[200]!),
                        ),
                        child: Center(
                          child: Text('No saved addresses',
                              style: TextStyle(color: Colors.grey[500])),
                        ),
                      ),

                    const SizedBox(height: 24),

                    // Change Password
                    OutlinedButton.icon(
                      onPressed: _showChangePassword,
                      icon: const Icon(Icons.lock_outline),
                      label: const Text('Change Password'),
                      style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14)),
                    ),
                  ],
                ),
    );
  }

  Widget _buildAddressCard(dynamic a) {
    final addr = a as Map<String, dynamic>;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        leading: Icon(Icons.location_on, color: Colors.blue.shade700),
        title: Text(
          addr['formattedAddress'] ?? addr['details'] ?? 'Address',
          style: const TextStyle(fontSize: 14),
        ),
        trailing: IconButton(
          icon: const Icon(Icons.delete_outline, color: Colors.red),
          onPressed: () async {
            final res = await ProfileService.deleteAddress(addr['id']);
            if (!mounted) return;
            _snack(res['message'] ?? (res['success'] == true ? 'Deleted' : 'Failed'),
                res['success'] == true ? Colors.orange : Colors.red);
            if (res['success'] == true) _load();
          },
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label) {
    return TextField(
      controller: ctrl,
      decoration: InputDecoration(labelText: label),
    );
  }
}
