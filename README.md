# Dose - Medication Adherence Tracking App
Dose is a smart medication adherence system that combines a sensor-equipped pill bottle with an interactive web dashboard. The pill bottle uses a load cell sensor to detect pills entering or leaving in real time, creating an accurate, tamper-resistant record of medication usage. This data is visualized through a responsive dashboard that provides patient profiles, adherence statistics, dosing windows, anomaly detection, and pill count trends. By bridging reliable hardware sensing with an intuitive software interface, Dose empowers researchers, clinicians, and caregivers to monitor adherence more effectively, reduce trial errors, and ultimately improve patient health outcomes.

This repository outlines the software end, a modern, responsive React component built with Next.js 14, TypeScript, TailwindCSS, and shadcn/ui components for tracking medication adherence and dosing patterns.

## Features

- **Subject View Dashboard**: Clean, modern interface for viewing patient profiles and medication data
- **Patient Profile Card**: Displays subject details, prescription information, and dosing windows
- **Analytics Dashboard**: Real-time stats including pill count, anomalies, and adherence percentage
- **Interactive Charts**: Pill count over time visualization using Recharts
- **Event Log Table**: Detailed medication event tracking with anomaly highlighting
- **Responsive Design**: Optimized for desktop and mobile viewing
- **Modern UI**: Built with shadcn/ui components and TailwindCSS

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library
- **Lucide React** - Beautiful icons
- **Recharts** - Composable charting library

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
dose_app/
├── app/
│   ├── globals.css          # Global styles and TailwindCSS
│   ├── layout.tsx           # Root layout component
│   └── page.tsx             # Home page
├── components/
│   ├── ui/                  # shadcn/ui components
│   │   ├── card.tsx
│   │   ├── button.tsx
│   │   └── table.tsx
│   └── SubjectView.tsx      # Main dashboard component
├── lib/
│   └── utils.ts             # Utility functions
└── package.json
```

## Component Features

### SubjectView Component

The main dashboard component includes:

- **Header Section**: App branding and navigation tabs
- **Subject Controls**: Choose Subject and New Subject buttons
- **Patient Profile**: Comprehensive patient information display
- **Statistics Cards**: Key metrics with visual emphasis
- **Chart Visualization**: Interactive pill count timeline
- **Event Log**: Detailed medication event tracking with anomaly detection

### Styling

- Dark theme with gray color palette
- Consistent card-based layout
- Responsive grid system
- Color-coded anomaly indicators
- Modern typography and spacing

## Customization

The component uses dummy data that can be easily replaced with real data sources. Key data structures are defined at the top of the `SubjectView.tsx` file:

- `subjectData`: Patient profile information
- `pillCountData`: Chart data points
- `eventLogData`: Medication event records
- `stats`: Dashboard statistics

## License

This project is for demonstration purposes.
