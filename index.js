var Service, Characteristic;
var request = require("request");

module.exports = function (homebridge)
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-thermostat-ember", "Thermostat", Thermostat);
};

function Thermostat(log, config)
{
	this.log = log;

    this.name = config.name;
    this.manufacturer = config.manufacturer || 'HTTP Manufacturer';
    this.model = config.model || 'homebridge-thermostat-ember';
    this.serial = config.serial || 'HTTP Serial Number';

    this.apiroute = config.apiroute
    this.username = config.username || null;
    this.password = config.password || null;
    this.gateway = config.gateway || null;
    this.zone = config.zone || null;
    this.timeout = config.timeout || 5000;

    this.temperatureDisplayUnits = config.temperatureDisplayUnits || 0;

    this.auth(function (error, token)
    {
        if (error)
        {
			this.log("Could not log into Hive");
			this.log(error);
        }
        else
        {
            this.log("Logged In");
            this.apiKey = token;

            this.displayZones();
		}
    }
    .bind(this));

    this.maxTemp = config.maxTemp || 30;
    this.minTemp = config.minTemp || 15;

    this.heatOnly = true;

    this.targetTemperature = 25;
    this.currentTemperature = 20;

    this.targetHeatingCoolingState = 3;
    this.heatingCoolingState = 1;

    this.log(this.name, this.apiroute);

    this.service = new Service.Thermostat(this.name);
}

Thermostat.prototype = {

    auth: function(callback)
    {
        var authDetails = {
            "userName": this.username,
            "password": this.password
        };

        request({
            url: this.apiroute + "/appLogin/login",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json: true,
            body: authDetails,
            method: 'POST',
        },
        function (error, response, body)
        {
            callback(null, body.data.token);
        });
    },

    displayZones: function ()
    {
        this.log("Getting Zones");

        this._httpRequest('/homes/list', '', 'GET', function (error, response, responseBody)
        {
            if (error)
            {
                this.log("[!] Error Getting Zones: %s", error.message);
            }
            else if (response.statusCode >= 300)
            {
                this.log("[!] Error Getting Gateway", response.statusCode, response.statusMessage);
            }
            else
            {
                if (responseBody.data[0].gatewayid == undefined)
                {
                    this.log("[!] Error Getting Gateway: No Gateways found.");
                }
                else
                {
                    this.log("[*] Found Gateway: " + responseBody.data[0].gatewayid);

                    var body = {
                        "gateWayId": responseBody.data[0].gatewayid
                    };

                    this._httpRequest('/zones/polling', body, 'POST', function (error, response, responseBody)
                    {
                        if (error)
                        {
                            this.log("[!] Error Getting Zones: %s", error.message);
                        }
                        else if (response.statusCode >= 300)
                        {
                            this.log("[!] Error Getting Zones", response.statusCode, response.statusMessage);
                        }
                        else
                        {
                            this.log("[*] Found " + responseBody.data.length + " Zones ");

                            for (var i = 0; i < responseBody.data.length; i++)
                            {
                                this.log("[*] Found Zone: Name - " + responseBody.data[i].name + " Zone ID - " + responseBody.data[i].zoneid);
                            }
                        }
                    }.bind(this));
                }
            }
        }.bind(this));
    },

    identify: function (callback)
    {
		this.log("Identify requested!");
		callback();
	},

    _httpRequest: function (url, body, method, callback)
    {
        request({
            url: this.apiroute + url,
            headers: {
                "Authorization": this.apiKey,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json: true,
            body: body,
            method: method,
        },
        function (error, response, body)
        {
            callback(error, response, body);
        });
    },

    getCurrentHeatingCoolingState: function (callback)
    {
        this.log("[+] getCurrentHeatingCoolingState from:", this.apiroute + "/status");

        var url = this.apiroute + "/zones/data";

        var body = {
            "gateWayId": this.gateway
        };

        this._httpRequest('/zones/polling', body, 'POST', function (error, response, responseBody)
        {
            if (error)
            {
                this.log("[!] Error Getting Zones: %s", error.message);
            }
            else if (response.statusCode >= 300)
            {
                this.log("[!] Error Getting Zones", response.statusCode, response.statusMessage);
            }
            else
            {
                for (var i = 0; i < responseBody.data.length; i++)
                {
                    if (responseBody.data[i].zoneid != this.zone)
                    {
                        continue;
                    }

                    var newValue = 1;

                    if (responseBody.data[i].mode == 3)
                    {
                        newValue = 0;
                    }

                    if (responseBody.data[i].currenttemperature > responseBody.data[i].targettemperature)
                    {
                        newValue = 0;
                    }

                    this.log("[*] currentHeatingCoolingState: %s", newValue);
                    this.currentHeatingCoolingState = newValue;
                    callback(null, this.currentHeatingCoolingState);
                }
            }
        }.bind(this));
	},

    getTargetHeatingCoolingState: function (callback)
    {
        this.log("[+] getTargerHeatingCoolingState from:", this.apiroute + "/status");

        var url = this.apiroute + "/zones/data";

        var body = {
            "gateWayId": this.gateway
        };

        this._httpRequest('/zones/polling', body, 'POST', function (error, response, responseBody)
        {
            if (error)
            {
                this.log("[!] Error Getting Zones: %s", error.message);
            }
            else if (response.statusCode >= 300)
            {
                this.log("[!] Error Getting Zones", response.statusCode, response.statusMessage);
            }
            else
            {
                for (var i = 0; i < responseBody.data.length; i++)
                {
                    if (responseBody.data[i].zoneid != this.zone)
                    {
                        continue;
                    }

                    var newValue = 1;

                    if (responseBody.data[i].mode == 3)
                    {
                        newValue = 0;
                    }

                    this.log("[*] targetHeatingCoolingState: %s", newValue);
                    this.targetHeatingCoolingState = newValue;
                    callback(null, this.targetHeatingCoolingState);
                }
            }
        }.bind(this));
    },

    setTargetHeatingCoolingState: function (value, callback)
    {
        this.log("[+] setTargetHeatingCoolingState from %s to %s", this.targetHeatingCoolingState, value);

        var url = this.apiroute + "/zones/setModel";

        // convert the mode type
        var mode = 3;

        if (value == 1)
        {
            mode = 0;
        }

        var body = {
            "zoneid": this.zone,
            "model": mode
        };

        this._httpRequest('/zones/setModel', body, 'POST', function (error, response, responseBody)
        {
            if (error)
            {
                this.log("[!] Error Setting Mode: %s", error.message);
            }
            else if (response.statusCode >= 300)
            {
                this.log("[!] Error Setting Mode", response.statusCode, response.statusMessage);
            }
            else
            {
                this.log("[*] Sucessfully set targetHeatingCoolingState to %s", value);

                this.service.setCharacteristic(Characteristic.CurrentHeatingCoolingState, value);

  		        callback();
            }
        }.bind(this));
    },

    getCurrentTemperature: function (callback)
    {
        this.log("[+] getCurrentTemperature from:", this.apiroute + "/zones/data");

        var url = this.apiroute + "/zones/data";

        var body = {
            "gateWayId": this.gateway
        };

        this._httpRequest('/zones/polling', body, 'POST', function (error, response, responseBody)
        {
            if (error)
            {
                this.log("[!] Error Getting Zones: %s", error.message);
            }
            else if (response.statusCode >= 300)
            {
                this.log("[!] Error Getting Zones", response.statusCode, response.statusMessage);
            }
            else
            {
                for (var i = 0; i < responseBody.data.length; i++)
                {
                    if (responseBody.data[i].zoneid != this.zone)
                    {
                        continue;
                    }

                    var newValue = parseFloat(responseBody.data[i].currenttemperature);

                    if (newValue < 0)
                    {
                        newValue = 0;
                    }

                    this.currentTemperature = newValue;
                    this.log("[*] currentTemperature: %s", this.currentTemperature);
                    callback(null, this.currentTemperature);
                }
            }
        }.bind(this));
    },

    getTargetTemperature: function (callback)
    {
        this.log("[+] getTargetTemperature from:", this.apiroute + "/zones/data");

        var url = this.apiroute + "/zones/data";

        var body = {
            "gateWayId": this.gateway
        };

        this._httpRequest('/zones/polling', body, 'POST', function (error, response, responseBody)
        {
            if (error)
            {
                this.log("[!] Error Getting Zones: %s", error.message);
            }
            else if (response.statusCode >= 300)
            {
                this.log("[!] Error Getting Zones", response.statusCode, response.statusMessage);
            }
            else
            {
                for (var i = 0; i < responseBody.data.length; i++)
                {
                    if (responseBody.data[i].zoneid != this.zone)
                    {
                        continue;
                    }

                    var newValue = parseFloat(responseBody.data[i].targettemperature);

                    if (newValue < 0)
                    {
                        newValue = 0;
                    }

                    this.targetTemperature = newValue;
                    this.log("[*] targetTemperature: %s", this.targetTemperature);
                    callback(null, this.targetTemperature);
                }
            }
        }.bind(this));
    },

    setTargetTemperature: function (value, callback)
    {
        this.log("[+] setTargetTemperature from %s to %s", this.targetTemperature, value);

        var url = this.apiroute + "/zones/setTargetTemperature";

        var body = {
            "zoneid": this.zone,
            "temperature": value
        };

        this._httpRequest('/zones/setTargetTemperature', body, 'POST', function (error, response, responseBody)
        {
            if (error)
            {
                this.log("[!] Error Setting Temperature: %s", error.message);
            }
            else if (response.statusCode >= 300)
            {
                this.log("[!] Error Setting Temperature", response.statusCode, response.statusMessage);
            }
            else
            {
                this.log("[*] Sucessfully set targetTemperature to %s", value);

  		        callback();
            }
        }.bind(this));
    },

    getTemperatureDisplayUnits: function (callback)
    {
        this.log("getTemperatureDisplayUnits:", this.temperatureDisplayUnits);

		callback(null, this.temperatureDisplayUnits);
	},

    setTemperatureDisplayUnits: function (value, callback)
    {
        this.log("[*] setTemperatureDisplayUnits from %s to %s", this.temperatureDisplayUnits, value);

        this.temperatureDisplayUnits = value;

		callback();
	},

    getName: function (callback)
    {
        this.log("getName :", this.name);

		callback(null, this.name);
	},

    getServices: function ()
    {
        this.informationService = new Service.AccessoryInformation();

        this.informationService
		    .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
		    .setCharacteristic(Characteristic.Model, this.model)
		    .setCharacteristic(Characteristic.SerialNumber, this.serial);

		this.service
			.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
			.on('get', this.getCurrentHeatingCoolingState.bind(this));

		this.service
			.getCharacteristic(Characteristic.TargetHeatingCoolingState)
			.on('get', this.getTargetHeatingCoolingState.bind(this))
			.on('set', this.setTargetHeatingCoolingState.bind(this));

		this.service
			.getCharacteristic(Characteristic.CurrentTemperature)
			.on('get', this.getCurrentTemperature.bind(this));

		this.service
			.getCharacteristic(Characteristic.TargetTemperature)
			.on('get', this.getTargetTemperature.bind(this))
			.on('set', this.setTargetTemperature.bind(this));

		this.service
			.getCharacteristic(Characteristic.TemperatureDisplayUnits)
			.on('get', this.getTemperatureDisplayUnits.bind(this))
            .on('set', this.setTemperatureDisplayUnits.bind(this));

		this.service
			.getCharacteristic(Characteristic.Name)
			.on('get', this.getName.bind(this));

		this.service.getCharacteristic(Characteristic.CurrentTemperature)
			.setProps({
				minStep: 0.1
			});

		this.service.getCharacteristic(Characteristic.TargetTemperature)
			.setProps({
				minValue: this.minTemp,
				maxValue: this.maxTemp,
				minStep: 0.5
			});
			this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
				.setProps({
					minValue: 0,
					maxValue: 1,
					validValues: [0,1]
                });

		return [this.informationService, this.service];
	}
};
