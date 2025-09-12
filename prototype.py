import requests
API_KEY = "YOUR_GOOGLE_PLACES_API_KEY"
lat, lng = 9.9312, 76.2673  # Example: Kochi
url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=200&type=cafe&key={API_KEY}"
response = requests.get(url).json()
for place in response["results"]:
    print(place["name"], "-", place["vicinity"])
