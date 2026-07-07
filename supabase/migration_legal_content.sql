-- ─────────────────────────────────────────────────────────────────
-- Migration: Seed finalized legal document content
-- ─────────────────────────────────────────────────────────────────
-- Run this once in the Supabase SQL editor. Safe to re-run —
-- ON CONFLICT (key) DO UPDATE so re-running refreshes the content
-- rather than erroring or duplicating.
--
-- These two keys back the public /privacy-policy and
-- /terms-and-conditions pages (src/pages/OtherPages.jsx →
-- LegalPageLayout), and are editable afterwards from
-- /admin/content → Site Copy → Legal, without a redeploy.
-- ─────────────────────────────────────────────────────────────────

INSERT INTO site_content (key, value) VALUES
('legal.privacy_policy', $$# Privacy Policy

**Effective Date:** 07.01.2026
**Last Updated:** 07.07.2026

## 1. Introduction

This Privacy Policy ("Policy") describes how RacquetIn Sports ("RacquetIn," "we," "us," or "our"), the operator of the website www.racquetin.com and its associated mobile and web applications (collectively, the "Platform"), collects, uses, discloses, stores, and protects the personal data of individuals who visit the Platform, create an account, subscribe to our newsletter, or purchase badminton equipment and related products — including racquets, shoes, bags, strings, grips, shuttlecocks, apparel, and accessories — through the Platform ("you," "your," or "User").

This Policy is published in accordance with, and forms part of our compliance obligations under, the Digital Personal Data Protection Act, 2023 ("DPDP Act"), the Information Technology Act, 2000 and the rules made thereunder (including the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011), and reflects, where appropriate, internationally recognised data protection principles consistent with the General Data Protection Regulation ("GDPR") for the benefit of Users who may access the Platform from outside India.

By accessing or using the Platform, creating an account, or otherwise providing us with your personal data, you acknowledge that you have read, understood, and agree to the collection, use, and disclosure of your information as described in this Policy. If you do not agree with this Policy, please do not use the Platform.

This Policy should be read together with our Terms & Conditions, Shipping Policy, and Returns & Refunds Policy, each published on the Platform.

## 2. Information We Collect

We collect personal data that you provide to us directly, data generated through your use of the Platform, and data received from third parties, as described below.

### 2.1 Personal Information

When you browse the Platform, create an account, place an order, or contact our customer support, we may collect:

- Full name
- Email address
- Mobile/telephone number
- Billing and shipping address(es)
- Gender (where voluntarily provided, e.g. for sizing recommendations)
- Order history and product preferences
- Correspondence with our customer support team

### 2.2 Account Information

If you register for an account on the Platform (authentication is provided through Supabase), we collect:

- Your registered email address and encrypted password credentials
- Account creation date and last login information
- Wishlist, saved addresses, and saved preferences associated with your account
- Verification status of your email address

We do not have access to your plaintext password at any time. Passwords are hashed and stored securely by our authentication provider.

### 2.3 Payment Information

We use Razorpay, a licensed and RBI-regulated payment aggregator, to process all payments made on the Platform. When you make a payment:

- Your card number, CVV, UPI PIN, net-banking credentials, and other sensitive payment credentials are entered directly into Razorpay's secure, PCI-DSS-compliant payment interface.
- **RacquetIn does not collect, view, transmit, or store your full card number, CVV, or banking credentials on its own servers at any time.**
- We only receive and store a payment confirmation status, a masked/tokenised reference to the transaction (such as a payment ID and the last four digits of a card, where applicable), the payment method used (e.g. card, UPI, net banking, wallet), and the transaction amount and date, for the purpose of order confirmation, invoicing, and dispute resolution.

### 2.4 Device Information

We automatically collect certain technical information when you access the Platform, including:

- IP address and approximate geographic location
- Browser type and version
- Operating system and device type
- Device identifiers
- Referring website or source
- Pages viewed, time spent on pages, and click patterns

### 2.5 Cookies

We use cookies and similar tracking technologies to operate and improve the Platform. Please see Section 8 (Cookies and Tracking Technologies) below for details.

### 2.6 Analytics Data

We may use analytics tools, including Google Analytics and, where enabled, Meta Pixel, to understand how Users interact with the Platform. This may include aggregated and pseudonymised data regarding page visits, conversion rates, and marketing campaign performance. See Section 7 (Third-Party Services) for further detail.

## 3. How We Use Your Information

We process your personal data for the following purposes:

- To create and manage your account on the Platform;
- To process, fulfil, and deliver your orders, including order confirmation, invoicing, and customer communication regarding order status;
- To process payments securely through Razorpay and reconcile transactions;
- To arrange shipping and delivery of your order through our logistics partners;
- To respond to customer support queries, complaints, and returns/refund requests;
- To send transactional communications, including order confirmations, shipping updates, and policy changes;
- To send you marketing communications and newsletters, where you have opted in, and to allow you to unsubscribe at any time;
- To detect, prevent, and investigate fraud, unauthorised transactions, and misuse of the Platform;
- To improve the Platform's functionality, product offerings, and user experience through analytics;
- To comply with applicable legal, regulatory, tax, and accounting obligations; and
- To enforce our Terms & Conditions and protect the rights, property, and safety of RacquetIn, our Users, and third parties.

## 4. Legal Basis for Processing

We process your personal data on the following legal grounds, consistent with the DPDP Act and, where applicable to Users outside India, the GDPR:

- **Consent:** Where you have given clear, informed consent, such as when subscribing to our newsletter, accepting cookies, or registering an account. You may withdraw consent at any time, as described in Section 12.
- **Performance of a contract:** Where processing is necessary to fulfil an order you have placed, deliver products to you, or provide customer support you have requested.
- **Legitimate uses / legitimate interests:** Where processing is necessary for purposes such as fraud prevention, Platform security, and improvement of our services, and such interests are not overridden by your rights.
- **Compliance with legal obligations:** Where we are required to retain or disclose information under applicable law, including tax, accounting, and consumer protection legislation.

Under the DPDP Act, RacquetIn acts as a Data Fiduciary in respect of the personal data of its Users, and certain of our service providers (such as Supabase, Razorpay, and our shipping partners) act as Data Processors on our behalf, bound by contractual obligations to protect your data.

## 5. Payment Processing

All payments made on the Platform are processed through Razorpay Software Private Limited, a payment gateway authorised and regulated by the Reserve Bank of India.

- Razorpay is independently PCI-DSS compliant and maintains its own privacy policy and security practices.
- We encourage you to review Razorpay's privacy policy to understand how your payment data is handled during the transaction process.
- RacquetIn does not store your full card details, CVV, UPI ID, or net-banking login credentials on its own servers or databases at any time.
- In the event of a payment dispute, refund, or chargeback, RacquetIn may share order-related information (such as order ID, amount, and customer contact details) with Razorpay solely for the purpose of resolving the dispute.

Razorpay's privacy policy is available at [razorpay.com/privacy](https://razorpay.com/privacy/).

## 6. Shipping and Delivery Information Sharing

To deliver your order, we share the minimum necessary information with our logistics and courier partners, which may include Shiprocket, Delhivery, NimbusPost, or other similar shipping and fulfilment providers engaged by us from time to time.

The information shared with shipping partners is limited to:

- Recipient's name
- Delivery address and pin code
- Contact number
- Order reference number and package details necessary for delivery (e.g. weight, dimensions)

Our shipping partners are contractually and/or by policy required to use this information solely for the purpose of delivering your order and are not authorised to use it for any other purpose, including marketing. We do not share your payment information, account credentials, or browsing history with shipping partners.

## 7. Third-Party Services

We engage the following categories of third-party service providers to operate the Platform. Each provider processes personal data only to the extent necessary to perform its function for us, under contractual confidentiality and data protection obligations.

### 7.1 Supabase

We use Supabase, a backend-as-a-service platform, to host our database, manage user authentication, and store application data (including account information, order records, wishlist data, and product catalogue information). Supabase provides infrastructure-level security, including encryption and access controls. Supabase's privacy practices are available at [supabase.com/privacy](https://supabase.com/privacy).

### 7.2 Razorpay

As described in Sections 2.3 and 5 above, Razorpay processes all payment transactions on our behalf as an independent, RBI-regulated payment aggregator.

### 7.3 Shipping Partners

As described in Section 6 above, we share limited delivery-related information with logistics partners such as Shiprocket, Delhivery, NimbusPost, or similar providers, solely for order fulfilment purposes.

### 7.4 Google Analytics

We use Google Analytics to understand aggregate usage patterns on the Platform, such as page views, session duration, traffic sources, and conversion metrics. Google Analytics may use cookies and similar technologies to collect this information. You may opt out of Google Analytics tracking by installing the [Google Analytics Opt-out Browser Add-on](https://tools.google.com/dlpage/gaoptout) or by adjusting your cookie preferences as described in Section 8.

### 7.5 Meta Pixel (Where Enabled)

Where enabled, we may use Meta Pixel (Facebook Pixel) to measure the effectiveness of our advertising campaigns on Meta platforms (Facebook and Instagram) and to deliver relevant advertisements to Users. Meta Pixel may collect information about your interactions with the Platform and match this with your Meta account, subject to Meta's own privacy policy, available at [facebook.com/privacy/policy](https://www.facebook.com/privacy/policy/). You may manage your ad preferences directly through your Meta account settings.

### 7.6 Other Service Providers

We may also engage cloud hosting providers (such as Vercel, for hosting our frontend application), email service providers (for transactional and marketing emails), and customer support tools, each of which may process limited personal data strictly to provide their respective services to us.

We do not sell your personal data to any third party for monetary consideration.

## 8. Cookies and Tracking Technologies

Cookies are small text files stored on your device when you visit the Platform. We use the following categories of cookies:

- **Strictly Necessary Cookies:** Required for core functionality, such as maintaining your login session and shopping cart contents.
- **Performance/Analytics Cookies:** Used to understand how Users interact with the Platform (e.g. Google Analytics).
- **Functional Cookies:** Used to remember your preferences, such as language or currency settings.
- **Advertising/Marketing Cookies:** Used, where enabled, to deliver relevant advertisements and measure their performance (e.g. Meta Pixel).

You can control or disable cookies through your browser settings at any time. Please note that disabling certain cookies may affect the functionality of the Platform, including your ability to log in or complete a purchase.

## 9. Marketing Communications

If you subscribe to our newsletter or opt in during account creation or checkout, we may send you marketing communications regarding new product launches, offers, and promotions via email, SMS, or WhatsApp.

- You may withdraw your consent to receive marketing communications at any time by clicking the "unsubscribe" link included in our marketing emails, replying "STOP" to SMS communications, or by contacting us at the support email provided in Section 17.
- Withdrawal of marketing consent will not affect transactional communications necessary for order processing, delivery updates, or customer support, which are sent on the basis of contract performance rather than marketing consent.

## 10. Data Retention

We retain personal data only for as long as necessary to fulfil the purposes described in this Policy, including:

- **Account information:** For as long as your account remains active, and for a reasonable period thereafter in case you wish to reactivate it, unless you request earlier deletion.
- **Order and transaction records:** For a period consistent with applicable tax, accounting, and consumer protection laws in India (generally up to eight years, or such other period as may be prescribed by applicable law).
- **Marketing consent records:** Until you withdraw consent or a reasonable period thereafter to reflect your withdrawal.
- **Customer support correspondence:** For a reasonable period to handle any follow-up queries or disputes.

Where data is no longer required for the purposes described above, we will delete, anonymise, or securely dispose of it in accordance with our internal data retention practices.

## 11. Data Security

We implement reasonable security practices and procedures in accordance with the Information Technology Act, 2000 and applicable rules, including:

- Encryption of data in transit (via HTTPS/TLS) and, where applicable, at rest;
- Access controls restricting personal data access to authorised personnel only, on a need-to-know basis;
- Secure authentication practices, including hashed password storage;
- Regular security reviews of our Platform and infrastructure;
- Contractual data protection obligations imposed on our third-party service providers.

While we take reasonable steps to protect your personal data, no method of transmission over the internet or electronic storage is completely secure. We cannot guarantee absolute security, and you provide your data to us at your own risk. In the unlikely event of unauthorised access, we will act in accordance with Section 15 (Data Breach Notification) below.

## 12. User Rights

In accordance with the DPDP Act and, where applicable, GDPR principles, you have the following rights in relation to your personal data:

- **Right to Access:** You may request confirmation of whether we process your personal data, and request a copy of such data.
- **Right to Correction:** You may request that we correct inaccurate or incomplete personal data.
- **Right to Erasure/Deletion:** You may request deletion of your personal data, subject to our legal obligations to retain certain records (such as transaction records required under tax law).
- **Right to Withdraw Consent:** Where processing is based on your consent (such as marketing communications or optional cookies), you may withdraw such consent at any time, without affecting the lawfulness of processing carried out prior to withdrawal.
- **Right to Grievance Redressal:** You have the right to file a complaint regarding the processing of your personal data with us (see Section 17), and, if unresolved, with the Data Protection Board of India (once constituted and operative under the DPDP Act).
- **Right to Nominate:** You may nominate another individual to exercise your rights under the DPDP Act in the event of your death or incapacity, by writing to us at the contact details in Section 17.

To exercise any of these rights, please contact us using the details in Section 17. We may require you to verify your identity before processing such requests, and we will respond within the timeframe prescribed under applicable law.

## 13. Children's Privacy

The Platform is intended for use by individuals who are at least 18 years of age or who otherwise possess the legal capacity to enter into a binding contract under the Indian Contract Act, 1872. We do not knowingly collect personal data from children without the consent of a parent or lawful guardian, as contemplated under the DPDP Act.

If you are a parent or guardian and believe that your child has provided us with personal data without your consent, please contact us at the details in Section 17, and we will take steps to verify and delete such data as appropriate.

## 14. International Data Transfers

While RacquetIn primarily operates in India and stores data with service providers whose infrastructure may be located in India or other jurisdictions (including data centres used by Supabase and other cloud providers), certain data may be processed or stored outside India in the course of providing the Platform's services.

Where your personal data is transferred outside India, we take reasonable steps to ensure that such transfers are made to jurisdictions or entities that maintain an adequate level of data protection consistent with the DPDP Act and, where applicable, GDPR standards, including through contractual safeguards with our service providers.

## 15. Data Breach Notification

In the event of a personal data breach that is likely to result in harm to you, we will:

- Take immediate steps to contain and investigate the breach;
- Notify the Data Protection Board of India and other relevant regulatory authorities as required under the DPDP Act and applicable law; and
- Notify affected Users without undue delay, providing information regarding the nature of the breach, the likely consequences, and the measures taken or proposed to address it, to the extent required by applicable law.

## 16. Changes to This Privacy Policy

We may update this Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. The "Last Updated" date at the top of this Policy indicates when it was last revised. Where changes are material, we will provide reasonable notice through the Platform or via email prior to the changes taking effect. Your continued use of the Platform after such changes constitutes your acceptance of the revised Policy.

## 17. Contact Information

If you have any questions, concerns, or requests regarding this Privacy Policy or the processing of your personal data, or if you wish to exercise any of your rights described in Section 12, please contact us at:

**Company Legal Name:** RacquetIn Sports
**Support Email:** racquetinsports@gmail.com
**Support Phone Number:** +91 9032123143

---

*This Privacy Policy is a general template prepared for illustrative purposes and does not constitute legal advice. RacquetIn is advised to have this document reviewed by a qualified Indian legal practitioner prior to publication, to ensure it accurately reflects its actual data processing practices and complies with the most current version of the DPDP Act, its implementing rules, and any other applicable law at the time of publication.*
$$),
('legal.terms_conditions', $$# Terms & Conditions

**Effective Date:** 07.01.2026

## 1. Introduction

Welcome to RacquetIn. These Terms & Conditions ("Terms") govern your access to and use of the website www.racquetin.com, and any associated mobile or web applications (collectively, the "Platform"), operated by RacquetIn Sports ("RacquetIn," "we," "us," or "our"), a company engaged in the retail of premium badminton racquets, shoes, bags, shuttlecocks, strings, grips, apparel, and accessories (collectively, "Products").

These Terms constitute a legally binding agreement between you ("you," "your," or "User") and RacquetIn. Please read them carefully before using the Platform or placing an order.

## 2. Acceptance of Terms

By accessing the Platform, creating an account, browsing our catalogue, or placing an order, you confirm that you have read, understood, and agree to be bound by these Terms, along with our Privacy Policy, Shipping Policy, and Returns, Refunds & Cancellations Policy, each of which is incorporated into these Terms by reference.

If you do not agree with any part of these Terms, you must discontinue use of the Platform immediately.

## 3. Eligibility to Use the Website

To use the Platform or place an order, you must be at least 18 years of age or possess the legal capacity to enter into a binding contract under the Indian Contract Act, 1872. If you are under 18, you may only use the Platform under the supervision and with the consent of a parent or legal guardian who agrees to be bound by these Terms on your behalf.

By using the Platform, you represent and warrant that you meet these eligibility requirements.

## 4. User Accounts and Responsibilities

4.1. You may be required to create an account to access certain features of the Platform, including order tracking, wishlists, and saved addresses.

4.2. When creating an account, you agree to:

- Provide accurate, current, and complete information;
- Maintain the security and confidentiality of your login credentials;
- Immediately notify us at racquetinsports@gmail.com of any unauthorised use of your account or any other breach of security.

4.3. You are responsible for all activity that occurs under your account. RacquetIn is not liable for any loss or damage arising from your failure to protect your account credentials.

4.4. RacquetIn reserves the right to suspend, restrict, or terminate any account at its sole discretion where fraud, abuse, or a violation of these Terms is suspected or confirmed, in accordance with Section 20.

## 5. Product Information and Availability

5.1. We take reasonable care to ensure that product descriptions, specifications, and images displayed on the Platform are accurate. However:

- Product specifications may change without notice, including as a result of manufacturer updates or design revisions;
- Manufacturers may revise product designs, materials, or packaging at their discretion;
- Colours displayed on the Platform may vary from the actual product due to differences in device displays, screen calibration, and photography conditions;
- All product images are illustrative and provided for reference purposes only;
- Availability of any Product is not guaranteed until your order has been confirmed and shipped.

5.2. In the event a Product you have ordered becomes unavailable after your order is placed, we will notify you and, where applicable, process a full refund for the unavailable item in accordance with our Returns, Refunds & Cancellations Policy.

## 6. Pricing and Taxes

6.1. All prices displayed on the Platform are quoted in Indian Rupees (INR) unless otherwise stated.

6.2. Prices are inclusive or exclusive of applicable taxes as indicated at checkout, and Goods and Services Tax (GST) or other applicable levies will be applied where required by law.

6.3. While we make every effort to ensure pricing accuracy, errors may occasionally occur. Where a pricing error is identified — whether due to a technical, typographical, or human error — RacquetIn reserves the right to correct the error and, where an order has already been placed at an obviously incorrect price, to cancel such order and issue a full refund.

6.4. RacquetIn reserves the right to change prices at any time without prior notice. Price changes will not affect orders that have already been confirmed.

## 7. Orders and Order Acceptance

7.1. Placing an order on the Platform constitutes an offer by you to purchase the selected Product(s), subject to these Terms.

7.2. An order confirmation email or notification does not constitute acceptance of your order, nor does it constitute a confirmation of our offer to sell. RacquetIn reserves the right, at its sole discretion, to accept or decline any order, in whole or in part, for reasons including but not limited to:

- Product unavailability or stock discrepancies;
- Pricing or listing errors;
- Suspected fraudulent activity;
- Inability to verify payment or delivery information;
- Non-compliance with these Terms.

7.3. A contract for the sale of Products is only formed once your order has been confirmed as shipped, and full payment has been received.

## 8. Payments

8.1. All payments made on the Platform are processed through Razorpay, a secure and RBI-regulated third-party payment gateway.

8.2. Successful authorisation of your payment method does not automatically constitute acceptance of your order. RacquetIn reserves the right to cancel or decline any order even after payment has been authorised, including where fraud, abuse, or irregularities are suspected.

8.3. If an order is cancelled after payment has been successfully processed, any amount collected will be refunded in accordance with our Returns, Refunds & Cancellations Policy.

8.4. You agree to provide accurate and valid payment information and warrant that you are authorised to use the payment method provided.

## 9. Shipping and Delivery

9.1. RacquetIn will make reasonable efforts to dispatch and deliver your order within the estimated timeframes indicated on the Platform at checkout. These timeframes are estimates only and are not guaranteed.

9.2. Delivery is carried out through third-party logistics and courier partners. While we work with reputable partners, RacquetIn is not responsible for delays caused by courier service disruptions, incorrect or incomplete delivery information provided by you, customs processes, or events outside our reasonable control (see Section 19, Force Majeure).

9.3. Risk in the Products shall pass to you upon delivery to the address provided at checkout.

9.4. For further detail on shipping timelines, charges, and tracking, please refer to our Shipping Policy published on the Platform.

## 10. Returns, Refunds and Cancellations

Returns, exchanges, refunds, and order cancellations are governed by our separate Returns, Refunds & Cancellations Policy, published on the Platform and incorporated into these Terms by reference. We encourage you to review this policy before making a purchase.

## 11. Manufacturer Warranty

Certain Products sold on the Platform may be covered by a manufacturer's warranty. The terms, duration, and conditions of any such warranty are governed by our separate Warranty Policy and/or the relevant manufacturer's own warranty terms, published on the Platform or provided with the Product. RacquetIn's role in respect of manufacturer warranties is limited to facilitating your claim with the relevant manufacturer or authorised service provider, except where required otherwise by applicable consumer protection law.

## 12. Intellectual Property

12.1. All content available on the Platform, including but not limited to the RacquetIn name and logo, website design and layout, graphics, product photography, videos, written content, and underlying software, is the exclusive property of RacquetIn or its licensors and is protected under applicable Indian and international intellectual property laws.

12.2. You may not copy, reproduce, distribute, modify, create derivative works from, publicly display, or otherwise commercially exploit any content from the Platform without RacquetIn's prior written permission.

12.3. Nothing in these Terms grants you any right or licence to use RacquetIn's trademarks, trade names, or branding without express written consent.

## 13. User Content and Reviews

13.1. The Platform may allow you to submit product reviews, ratings, comments, or other content ("User Content"). By submitting User Content, you represent that it is:

- Truthful and based on genuine experience;
- Lawful and compliant with applicable law;
- Respectful and free from abusive, defamatory, or offensive language;
- Free of any infringement of the intellectual property or other rights of any third party.

13.2. By submitting User Content, you grant RacquetIn a non-exclusive, worldwide, royalty-free, perpetual licence to use, reproduce, display, and distribute such content in connection with the operation and promotion of the Platform.

13.3. RacquetIn reserves the right, at its sole discretion, to remove, edit, or refuse to publish any User Content that it considers inappropriate, unlawful, or in violation of these Terms, without prior notice.

## 14. Prohibited Uses

You agree not to use the Platform to:

- Violate any applicable law or regulation;
- Infringe upon the intellectual property, privacy, or other rights of any third party;
- Transmit any harmful code, malware, or disruptive technology;
- Attempt to gain unauthorised access to the Platform, other user accounts, or RacquetIn's systems;
- Engage in fraudulent transactions, including the use of stolen payment methods;
- Scrape, harvest, or extract data from the Platform using automated means without authorisation;
- Impersonate any person or entity, or misrepresent your affiliation with any person or entity;
- Interfere with or disrupt the proper functioning of the Platform.

RacquetIn reserves the right to investigate and take appropriate legal action, including suspension of access and reporting to law enforcement authorities, against anyone who violates this Section.

## 15. Accuracy of Information

While RacquetIn takes reasonable steps to ensure that information published on the Platform — including product descriptions, pricing, promotional content, and policies — is accurate and up to date, we do not warrant that such information is complete, error-free, or current at all times. RacquetIn reserves the right to correct any errors, inaccuracies, or omissions, and to change or update information at any time without prior notice.

## 16. Third-Party Services

The Platform may integrate or rely upon services provided by third parties, including payment processing (Razorpay), logistics and courier partners, cloud hosting and infrastructure providers, and analytics or marketing tools. RacquetIn is not responsible for the acts, omissions, terms, or privacy practices of these third-party service providers, each of which may be governed by their own separate terms and policies. Your use of any third-party service accessed through the Platform is at your own discretion and risk.

## 17. Limitation of Liability

17.1. To the maximum extent permitted by applicable law, RacquetIn shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, loss of data, loss of goodwill, or business interruption, arising out of or in connection with your use of the Platform or any Product purchased through it.

17.2. RacquetIn shall not be liable for delays or failures in delivery caused by third-party courier or logistics partners, or for any event or circumstance outside our reasonable control (see Section 19, Force Majeure).

17.3. To the maximum extent permitted by applicable law, RacquetIn's total aggregate liability arising out of or in connection with any order shall not exceed the total amount paid by you for the specific Product giving rise to the claim.

17.4. Nothing in these Terms shall exclude or limit RacquetIn's liability where such exclusion or limitation is not permitted under applicable Indian consumer protection law.

## 18. Indemnification

You agree to indemnify, defend, and hold harmless RacquetIn, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of or in any way connected with your breach of these Terms, your misuse of the Platform, or your violation of any applicable law or the rights of any third party.

## 19. Force Majeure

RacquetIn shall not be held liable for any failure or delay in the performance of its obligations under these Terms where such failure or delay arises from circumstances beyond its reasonable control, including but not limited to:

- Natural disasters (including floods, earthquakes, and severe weather events);
- Government actions, restrictions, or regulatory changes;
- Pandemics, epidemics, or public health emergencies;
- Strikes, lockouts, or other industrial or labour disputes;
- Supply chain disruptions or shortages affecting manufacturers or logistics partners;
- Internet, telecommunications, or infrastructure failures.

During any such event, RacquetIn's obligations under these Terms shall be suspended for the duration of the event, and reasonable efforts will be made to resume normal operations as soon as practicable.

## 20. Suspension or Termination of Accounts

20.1. RacquetIn reserves the right to suspend or terminate your account or access to the Platform, with or without prior notice, where we reasonably believe that you have:

- Violated these Terms;
- Engaged in fraudulent, abusive, or unlawful conduct;
- Provided false or misleading information;
- Posed a risk to the security or integrity of the Platform or other Users.

20.2. Upon suspension or termination, your right to use the Platform will cease immediately. Any provisions of these Terms which by their nature should survive termination — including but not limited to intellectual property, limitation of liability, indemnification, and governing law — shall continue to apply.

## 21. Privacy

Your use of the Platform is also governed by our Privacy Policy, which describes how we collect, use, store, and protect your personal data, and is incorporated into these Terms by reference. Please review our Privacy Policy carefully before using the Platform.

## 22. Governing Law

These Terms, and any dispute or claim arising out of or in connection with them or their subject matter, shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles.

## 23. Jurisdiction

Subject to Section 22, any dispute arising out of or in connection with these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts located in Nellore, India, and you irrevocably submit to the jurisdiction of such courts.

---

## Contact Us

If you have any questions regarding these Terms, please contact us at:

**Registered Business Name:** RacquetIn Sports
**Support Email:** racquetinsports@gmail.com
**Phone Number:** +91 9032123143
$$)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
