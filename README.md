# explorer-map-remix
Explorer Map Remix

Explorer Map Remix adds a gamified exploration mode to Google Maps. Instead of showing all nearby places by default, the app only displays roads. As you physically travel to new areas, nearby points of interest (restaurants, shops, parks, landmarks) gradually unlock on the map.

This makes commuting and traveling feel like solving a puzzle or adventure game! 🚶‍♀️🚗

Features

Roads-only mode: Start with a clean map view.
Unlock nearby places as you travel to new areas.
Gamification: Earn badges, achievements, and streaks for exploring.
Progress tracking: Save unlocked areas to your profile.


APIs Used

Google Maps SDK → for map display and custom styling.
Google Places API → to fetch nearby places dynamically.
Firebase (optional) → to store user progress, unlocked places, and achievements.


How It Works

User opens the app → sees only roads.
As they travel, nearby POIs within a certain radius (e.g., 200m) are revealed.
The app stores visited/unlocked places to track progress.
Badges/achievements are awarded for milestones.


Future Improvements

Social mode: see what your friends have unlocked.
Quests: “Visit 5 new cafés this week.”
AR animations for place reveal.

This is a concept project built to explore gamification of maps and navigation apps.

Running the Prototypes

Both the Python and HTML prototypes use Google APIs.  
To run them, you need your own Google Maps/Places API key.

1. Go to [Google Cloud Console](https://console.cloud.google.com/).  
2. Create a new project.  
3. Enable **Maps JavaScript API** and **Places API**.  
4. Generate an API key.  
5. Replace `"YOUR_API_KEY"` in:
   - `prototype.py` → replace `API_KEY = "YOUR_GOOGLE_PLACES_API_KEY"`  
   - `index.html` → replace `key=YOUR_API_KEY` in the script tag.  

Now run:
- `prototype.py` → fetches nearby places in terminal.  
- `index.html` → open in a browser to see the map demo.
