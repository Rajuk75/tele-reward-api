import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import PaymentMethod from "../src/models/paymentMethod.model.js";

const seedPaymentMethods = async () => {
    try {
        await connectDB();

        const methods = [
            {
                name: "UPI Transfer",
                code: "upi",
                isActive: true,
                processingTime: "Instant",
                minWithdrawal: 10,
                maxWithdrawal: 5000,
                requiredFields: [
                    { label: "Enter UPI ID", key: "upi", inputType: "text" }
                ]
            },
            {
                name: "Bank Transfer (IMPS)",
                code: "bank",
                isActive: true,
                processingTime: "Instant",
                minWithdrawal: 100,
                maxWithdrawal: 10000,
                requiredFields: [
                    { label: "Account Number", key: "account_number", inputType: "text" },
                    { label: "IFSC Code", key: "ifsc", inputType: "text" },
                    { label: "Account Holder Name", key: "holder_name", inputType: "text" }
                ]
            }
        ];

        for (const m of methods) {
            await PaymentMethod.findOneAndUpdate({ code: m.code }, m, { upsert: true, new: true });
            console.log(`Payment method '${m.name}' seeded/updated.`);
        }

        console.log("Seeding completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seedPaymentMethods();
