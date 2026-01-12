const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// --- REGISTER API ---
exports.adminRegister = async (req, res) => {
    try {
        const { email, password } = req.body;


        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin already exists" });
        }


        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);


        const newAdmin = new Admin({
            email,
            password: hashedPassword,
            role: 'admin'
        });

        await newAdmin.save();

        res.status(201).json({
            message: "Admin registered successfully",
            admin: { id: newAdmin._id, email: newAdmin.email }
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// --- LOGIN API (Jo aapne banai thi) ---
exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: admin._id, role: admin.role }, // Payload mein role add kiya
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Response mein role add kar diya gaya hai
        res.status(200).json({
            message: "Login successful",
            token,
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role  // <--- Yeh line add ki hai
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


exports.getAllAdmins = async (req, res) => {

    try {

        const admins = await Admin.find().select('-password');
        res.status(200).json(admins);

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }

}


exports.updateAdmin = async (req, res) => {

    try {

        const { email, password, role } = req.body;

        const updateData = {};

        if (email) updateData.email = email;
        if (role) updateData.role = role;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const updatedAdmin = await Admin.findByIdAndUpdate(

            req.params.id,
            { $set: updateData },
            { new: true }

        ).select('-password');


        if (!updatedAdmin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res.status(200).json({ message: "Admin updated successfully", admin: updatedAdmin });


    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }

}


// --- DELETE ADMIN ---
exports.deleteAdmin = async (req, res) => {
    try {
        const admin = await Admin.findByIdAndDelete(req.params.id);

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res.status(200).json({ message: "Admin deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};