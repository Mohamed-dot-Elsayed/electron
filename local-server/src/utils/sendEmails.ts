import nodemailer from "nodemailer";

export const sendEmail = async (to: string, subject: string, text: string) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be configured");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `"Systego" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });

  return info;
};

// import SibApiV3Sdk from "sib-api-v3-sdk";

// // إعداد Brevo API
// const client = SibApiV3Sdk.ApiClient.instance;
// client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY!;

// const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// // دالة لإرسال الإيميل
// export const sendEmail = async (to: string, subject: string, text: string) => {
//   try {
//     await apiInstance.sendTransacEmail({
//       sender: { email: process.env.BREVO_SENDER_EMAIL!, name: "Smart College" },
//       to: [{ email: to }],
//       subject,
//       textContent: text,
//     });
//     console.log("✅ Email sent via Brevo API");
//   } catch (error) {
//     console.error("❌ Email error:", error);
//   }
// };





// import bcrypt from "bcrypt";
// import nodemailer from "nodemailer";
// import jwt from "jsonwebtoken";
// import { Resend } from "resend";
// import { firestore } from "./firebase";
// import { emailVerificationLinkTemplate, passwordResetTemplate } from "./emailTemplate";

// const PASSWORD_RESET_COLLECTION = "password_reset_codes";
// const PASSWORD_RESET_CODE_LENGTH = 6;
// const PASSWORD_RESET_LIFETIME_MINUTES = 5;
// const EMAIL_VERIFICATION_LIFETIME_HOURS = 1;
// const EMAIL_VERIFICATION_SECRET = process.env.EMAIL_VERIFICATION_SECRET || process.env.JWT_SECRET || "";

// type PasswordResetRecord = {
// 	email: string;
// 	codeHash: string;
// 	expiresAt: string;
// 	createdAt: string;
// 	used: boolean;
// };

// const getEmailDocumentId = (email: string) => Buffer.from(email.toLowerCase()).toString("base64url");

// const generateNumericCode = (length: number = PASSWORD_RESET_CODE_LENGTH): string => {
// 	let code = "";

// 	for (let index = 0; index < length; index += 1) {
// 		code += Math.floor(Math.random() * 10).toString();
// 	}

// 	return code;
// };

// const getFromEmail = () => process.env.EMAIL_FROM || process.env.SMTP_FROM || "no-reply@mathhouse.app";

// const getResendClient = () => {
// 	if (!process.env.RESEND_API_KEY) {
// 		return null;
// 	}

// 	return new Resend(process.env.RESEND_API_KEY);
// };

// const getSmtpTransporter = () => {
// 	const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

// 	if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
// 		return null;
// 	}

// 	return nodemailer.createTransport({
// 		host: SMTP_HOST,
// 		port: Number(SMTP_PORT),
// 		secure: Number(SMTP_PORT) === 465,
// 		auth: {
// 			user: SMTP_USER,
// 			pass: SMTP_PASS,
// 		},
// 	});
// };

// const sendEmail = async ({
// 	to,
// 	subject,
// 	html,
// }: {
// 	to: string;
// 	subject: string;
// 	html: string;
// }) => {
// 	const resend = getResendClient();

// 	if (resend) {
// 		await resend.emails.send({
// 			from: getFromEmail(),
// 			to,
// 			subject,
// 			html,
// 		});

// 		return;
// 	}

// 	const transporter = getSmtpTransporter();

// 	if (transporter) {
// 		await transporter.sendMail({
// 			from: getFromEmail(),
// 			to,
// 			subject,
// 			html,
// 		});

// 		return;
// 	}

// 	throw new Error("No email provider configured. Set RESEND_API_KEY or SMTP credentials.");
// };

// export const savePasswordResetCode = async (email: string, code: string, expiresAt: Date) => {
// 	const codeHash = await bcrypt.hash(code, 10);
// 	const docId = getEmailDocumentId(email);

// 	const payload: PasswordResetRecord = {
// 		email: email.toLowerCase(),
// 		codeHash,
// 		expiresAt: expiresAt.toISOString(),
// 		createdAt: new Date().toISOString(),
// 		used: false,
// 	};

// 	await firestore.collection(PASSWORD_RESET_COLLECTION).doc(docId).set(payload);
// };

// export const verifyPasswordResetCode = async (email: string, code: string) => {
// 	const docId = getEmailDocumentId(email);
// 	const snapshot = await firestore.collection(PASSWORD_RESET_COLLECTION).doc(docId).get();

// 	if (!snapshot.exists) {
// 		return false;
// 	}

// 	const data = snapshot.data() as PasswordResetRecord;

// 	if (data.used) {
// 		return false;
// 	}

// 	if (new Date(data.expiresAt).getTime() < Date.now()) {
// 		return false;
// 	}

// 	return bcrypt.compare(code, data.codeHash);
// };

// export const consumePasswordResetCode = async (email: string) => {
// 	const docId = getEmailDocumentId(email);

// 	await firestore.collection(PASSWORD_RESET_COLLECTION).doc(docId).set(
// 		{
// 			used: true,
// 		},
// 		{ merge: true }
// 	);
// };

// export const sendPasswordResetEmail = async (email: string, name: string = "there") => {
// 	const code = generateNumericCode(PASSWORD_RESET_CODE_LENGTH);
// 	const expiresAt = new Date(Date.now() + PASSWORD_RESET_LIFETIME_MINUTES * 60 * 1000);

// 	await savePasswordResetCode(email, code, expiresAt);

// 	await sendEmail({
// 		to: email,
// 		subject: "Password Reset Code",
// 		html: passwordResetTemplate(name, code, `${PASSWORD_RESET_LIFETIME_MINUTES} minutes`),
// 	});

// 	return {
// 		email,
// 		expiresAt,
// 		lifetimeMinutes: PASSWORD_RESET_LIFETIME_MINUTES,
// 	};
// };

// export const PASSWORD_RESET_CODE_TTL_MINUTES = PASSWORD_RESET_LIFETIME_MINUTES;

// type EmailVerificationPayload = {
// 	studentId: string;
// 	email: string;
// 	purpose: "student-email-verification";
// };

// export const generateEmailVerificationToken = (studentId: string, email: string) => {
// 	if (!EMAIL_VERIFICATION_SECRET) {
// 		throw new Error("Missing EMAIL_VERIFICATION_SECRET or JWT_SECRET for email verification.");
// 	}

// 	return jwt.sign(
// 		{
// 			studentId,
// 			email,
// 			purpose: "student-email-verification",
// 		} satisfies EmailVerificationPayload,
// 		EMAIL_VERIFICATION_SECRET,
// 		{ expiresIn: `${EMAIL_VERIFICATION_LIFETIME_HOURS}h` }
// 	);
// };

// export const verifyEmailVerificationToken = (token: string) => {
// 	if (!EMAIL_VERIFICATION_SECRET) {
// 		throw new Error("Missing EMAIL_VERIFICATION_SECRET or JWT_SECRET for email verification.");
// 	}

// 	return jwt.verify(token, EMAIL_VERIFICATION_SECRET) as EmailVerificationPayload;
// };

// export const sendStudentVerificationEmail = async (params: {
// 	studentId: string;
// 	email: string;
// 	name: string;
// }) => {
// 	const token = generateEmailVerificationToken(params.studentId, params.email);
// 	const publicAppUrl = (process.env.PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
// 	const verificationUrl = `${publicAppUrl}/api/user/auth/verify-email?token=${encodeURIComponent(token)}`;

// 	await sendEmail({
// 		to: params.email,
// 		subject: "Verify your Maths House email",
// 		html: emailVerificationLinkTemplate(params.name, verificationUrl, `${EMAIL_VERIFICATION_LIFETIME_HOURS} hour`),
// 	});

// 	return {
// 		token,
// 		verificationUrl,
// 		expiresInHours: EMAIL_VERIFICATION_LIFETIME_HOURS,
// 	};
// };
