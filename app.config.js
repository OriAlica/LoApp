export default ({ config }) => ({
  ...config,
  name: config.name ?? "lo-scanitem-app", // fallback if not defined elsewhere
  slug: config.slug ?? "lo-scanitem-app", // required
  extra: {
    eas: {
      projectId: "136a71b0-6356-4089-bc81-275ee3bb591b", // 👈 Replace with actual project ID
    },
  },
  expo: {
    ...config.expo,
    ios: {
      ...config.expo?.ios,
      infoPlist: {
        NSCameraUsageDescription: "This app uses the camera to scan QR codes.",
      },
    },
  },
});
