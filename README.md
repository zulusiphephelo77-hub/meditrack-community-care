# Meditrack Community Care

Rebrand and rebuild my site as "MediCare Sync" (tagline "Right Care. Right Place. Right Time."), following the attached mockup. Use Lovable Cloud for login and database. Design it mobile-first with a bottom tab bar on phones. Colours: green/teal for patients, blue for facilities.



1. Landing page: two big cards. "Patients: Access your care, appointments and medicine" (green) and "Healthcare Facilities: Manage stock, orders and patients" (blue). Footer: "Connected care for stronger rural communities". Show a banner: "Prototype with fictional data, not real health records".

2. Patient login: hospital/patient number, full name, date of birth, plus a demo account button. Use fictional demo patients only.

3. Facility login: username and password, with a "Use demo account" dropdown (Provincial Warehouse Pietermaritzburg, Edendale Hospital, KwaDabeka CHC, Ndwedwe Rural Clinic, Ixopo Rural Clinic, Mobile Clinic Unit 1). Patients must never access facility screens.

4. Database: facilities, medicines, stock_batches (facility, medicine, batch, quantity, max capacity, avg daily use, expiry), patients, appointments. Seed fictional KZN data for amlodipine 10mg, insulin, enalapril, salbutamol, Rifalax 250 (TB), amoxicillin 500mg, paracetamol 500mg, with a mix of in stock, low, out of stock and near-expiry batches, and one surplus clinic.

5. Patient Dashboard: "Hello, [name]", patient number, next hospital visit card, medicine status card (Available / Not available) and a red "Medicine not available: View options" alert. Bottom nav: Home, Appointments, Medicines, More.

6. Patient Appointments: Upcoming / Past tabs and a "Request Transfer" button.

7. Medicine Details: medicine name and condition, status badge (In Stock / Low / Not available), current stock in tablets, an "Expiring soon" warning, "Request Transfer: sent to nearest hospital", and "View alternative hospitals with stock nearby".



Remove the old demo data (Paracetamol/Atorvastatin dashboard).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://meditrack-community-care.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/156b8cca-058b-4036-b11d-bef69a39c048).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
