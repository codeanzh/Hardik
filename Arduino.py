import requests

url = "https://weathercast-arduino.herokuapp.com/saveData"

data = {
    "arduinoCode": 12345,
    "temperature": 125,
    "humidity": 10,
    "presure": 1.5,
    "windSpeed": 10,
    "direction": 4,
    "rain": 0
}

x = requests.post(url, data = data)

print(x.text)