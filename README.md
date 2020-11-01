# homebridge-thermostat

#### Homebridge plugin to control a web-based thermostat

## Installation

1. Install [homebridge](https://github.com/nfarina/homebridge#installation-details)
2. Install this plugin: `npm install -g homebridge-thermostat-ember`
3. Run plugin without gateway and zone config entries to see list of detected zones in your home.
3. Add an accessory for each zone you want to appear (see below)

## Configuration example

```json
"accessories": [
  {
      "accessory": "Thermostat",
      "name": "Downstairs",
      "apiroute": "https://eu-https.topband-cloud.com/ember-back",
      "username": "email",
      "password": "password",
      "gateway": "Gateway ID",
      "zone": "Zone ID"
  },
  {
      "accessory": "Thermostat",
      "name": "Upstairs",
      "apiroute": "https://eu-https.topband-cloud.com/ember-back",
      "username": "email",
      "password": "password",
      "gateway": "Gateway ID",
      "zone": "Zone ID"
  }
],
```
