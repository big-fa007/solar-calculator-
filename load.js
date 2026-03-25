// -------General function ---------------
function showResult(element, value) {
    element.innerText = value
    element.classList.add("animate")
    setTimeout(() => element.classList.remove("animate"), 300)
}

// -------Appliance Energy function ---------------
function calculateEnergy(power, hours, quantity) {
    return power * hours * quantity
}

// -------Total Appliance Energy function ---------------
function calculateTotalEnergy() {

    let totalEnergy = 0

    for (let i = 0; i < appliances.length; i++) {

        const app = appliances[i];
        const energy = calculateEnergy(app.power, app.hours, app.quantity) 
        totalEnergy += energy
    }
    return totalEnergy / 1000
}

// -------LocalStorage function ---------------
function saveData() {
    localStorage.setItem('appliances', JSON.stringify(appliances))
}


function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem("appliances")) || []
        appliances.length = 0
        appliances.push(...saved)
    } catch {
        appliances.length = 0
    }
}
// -------End of General function ---------------


// -------------- Appliance functions ----------------------
const appliances = []
let listEl = document.getElementById("appliance-list")
const total = document.getElementById("total-energy")
const applianceForm = document.getElementById("appliance-form")


function renderAppliances() {
    if (appliances.length === 0) {
        listEl.innerHTML = "<p>No appliances added yet</p>"
        total.innerText = "0 Wh (0 KWh)"
        return
    }

    let html = ""
    

    for (let i = 0; i < appliances.length; i++) {

        const app = appliances[i];
        const energy = calculateEnergy(app.power, app.hours, app.quantity)

        html += `
        <div class="appliance-card">
            Appliance name: <strong>${app.name}</strong><br>
            Energy: ${energy}Wh<br>
            Motor: ${app.isMotor ? "Yes" : "No"}<br>
            <button onclick="removeAppliance(${i})">Remove</button>
        </div>
        `
    }
    listEl.innerHTML = html
    const totalEnergyKwh = calculateTotalEnergy()
    const totalEnergyWh = totalEnergyKwh * 1000
    total.innerText = `${totalEnergyWh} Wh (${totalEnergyKwh.toFixed(2)} KWh)`
}


function validateApplianceInputs(name, power, hours, quantity) {
    if (name.trim() === "") {
        throw "Add a name"
    } 
    else if (isNaN(power) || power <= 0) {
        throw "Power must be a valid positive number"
    }
    else if (isNaN(hours) || hours <= 0) {
        throw "Hours Used must be a valid positive number"
    }
    else if (isNaN(quantity) || quantity <= 0) {
        throw "Quantity must be a valid positive number"
    } 
}


function calculateSystemSize(dailyEnergy, sunHours, efficiency) {
    const calEfficiency = efficiency / 100
    return dailyEnergy / (sunHours * calEfficiency)
}


applianceForm.addEventListener("submit", (e) => {
    e.preventDefault();

    let name = document.getElementById("name").value
    let power = Number(document.getElementById("power").value);
    let hours = Number(document.getElementById("hours").value);
    let quantity = Number(document.getElementById("quantity").value);
    let isMotor = document.getElementById("isMotor").checked

    try {
        validateApplianceInputs(name, power, hours, quantity)

        const appliance = {
        name,
        power,
        hours,
        quantity,
        isMotor
    }

        appliances.push(appliance)
        saveData()
        renderAppliances()
        
        applianceForm.reset()
        document.getElementById("appliance-error").innerText = ''
    } catch (error) {
        document.getElementById("appliance-error").innerText = error
    }
})

function removeAppliance(index) {
    appliances.splice(index, 1)
    saveData()
    renderAppliances()
    
}
// --------------End of Appliance ----------------------



// -------------- Panel sizing functions----------------------
const panelForm = document.getElementById("panel-form")

function calculatePanels(systemSizeKW, watts) {
    if (isNaN(systemSizeKW) || systemSizeKW <=0) {
        throw "Invalid system size!"
    }

    if (isNaN(watts) || watts <=0) {
        throw "Panel wattage must be greater than 0!"
    }

    const solarW = systemSizeKW * 1000
    const panel = solarW / watts

    if (!isFinite(panel)) {
        throw "Calculation error!"
    }
    return Math.ceil(panel)
}


function validatePanelInputs(sunHours, watts, efficiency) {
    if (isNaN(sunHours) || sunHours <= 0) {
        throw "Peak sun hours must be a valid positive number"
    }

    else if (isNaN(watts) || watts <= 0) {
        throw "Panel Wattage must be a valid positive number"
    }

    else if (isNaN(efficiency) || efficiency < 50 || efficiency > 90) {
        throw "System efficiency must be between 50 - 90"
    } 
}


panelForm.addEventListener('submit', (e) => {

    e.preventDefault();
    let sunHours = Number(document.getElementById("sunHours").value);
    let watts = Number(document.getElementById("watts").value);
    let efficiency = Number(document.getElementById("efficiency").value);

    try {


        validatePanelInputs(sunHours, watts, efficiency)

        const dailyEnergy = calculateTotalEnergy()

        if (dailyEnergy === 0) {
        throw "Add at least one appliance"
        }

        const systemSizeKW =calculateSystemSize(dailyEnergy, sunHours, efficiency)

        const panels = calculatePanels(systemSizeKW, watts);

        showResult(document.getElementById("panels-needed"), panels);
        showResult(document.getElementById("system-size"), `${systemSizeKW.toFixed(2)} KW`);

        let warnings = []

        if (panels > 50) {
            const betterPanels = Math.ceil((systemSizeKW * 1000) / 400)
            warnings.push(`⚠️ Too many panels. Try 400W → ${betterPanels} panels.`)
        }

        if (efficiency < 60) {
            warnings.push("⚠️ Low efficiency reduces performance.")
        }

        if (sunHours < 3) {
            warnings.push("⚠️ Low sun hours — more panels needed.")
        }

        const panelError = document.getElementById("panel-error")
        panelError.innerText = warnings.join("\n")
        
    } catch (error) {
        document.getElementById("panel-error").innerText = error
        
    }
})
// -------------- End of Panel sizing functions----------------------



// --------------Battery sizing functions----------------------

function validateBatteryInputs(autonomy, dod, voltage) {
    if (isNaN(autonomy) || autonomy <= 0) {
        throw "Day of Autonomy must be a valid positive number"
    }

    else if (isNaN(dod) || dod < 20 || dod > 90) {
        throw "Depth of Discharge must between 20 - 90"
    }
    else if (![12, 24, 48].includes(voltage)) {
        throw "Voltage must be either 12V or 24V or 48V"
    }
}

function calculateBattery(dailyEnergy, voltage, autonomy, dod) {
    const dailyEnergyAh = convertWattsToAmpere(dailyEnergy, voltage)
    const dodDecimal = dod / 100
    const batterySize = (dailyEnergyAh * autonomy) / dodDecimal
    return Math.ceil(batterySize)
}

function convertWattsToAmpere(dailyEnergy, voltage) {
    const dailyEnergyWh = dailyEnergy * 1000
    const dailyEnergyAh = dailyEnergyWh / voltage
    return dailyEnergyAh
}


const batteryForm = document.getElementById("battery-form")

batteryForm.addEventListener('submit', (e)=>{

    e.preventDefault();
    let autonomy = Number(document.getElementById("autonomy").value)
    let dod = Number(document.getElementById("dod").value) || 50
    let voltage = Number(document.getElementById("volt").value)


    try {
        validateBatteryInputs(autonomy, dod, voltage)

        const dailyEnergy = calculateTotalEnergy()

        if (dailyEnergy === 0) {
            throw "Add at least one appliance"
        }

        const result = calculateBattery(dailyEnergy, voltage, autonomy, dod)
        const totalWh = result * voltage

        showResult(document.getElementById("battery-result"), `${result}Ah  @ ${voltage}V (${totalWh}Wh)`)
        
        document.getElementById("battery-error").innerHTML = ''
    } catch (error) {
        document.getElementById("battery-error").innerHTML = error
        
    }
})


// -------------- End of Battery sizing functions----------------------




// --------------Inverter sizing functions----------------------
function calculatePeakLoad(appliances, surgeMultiplier) {
    let normalLoad = 0
    let surgeLoad = 0

    for (let  app of appliances) {
        let baseLoad = app.power * app.quantity
        normalLoad += baseLoad

        if (app.isMotor) {
            let motorSurge = baseLoad * surgeMultiplier
            surgeLoad += motorSurge
        }
        
    }
    const totalLoad = normalLoad + surgeLoad

    return {
        normalLoad,
        surgeLoad, 
        totalLoad
    }
}

function validateInverterInput(safeMargin, surgeMultiplier) {
    if (isNaN(safeMargin) || safeMargin < 0 || safeMargin > 50) {
        throw "Safety margin must be between 0 to 50"
    }

    else if (isNaN(surgeMultiplier) || surgeMultiplier < 1 || surgeMultiplier > 6) {
        throw "surge multiplier must be between 1 to 6"
    }
}

function calculateInverterSize(peakLoad, safeMargin) {
    const inverterSize = peakLoad * (1 + safeMargin)
    return Math.ceil(inverterSize)
}

const inverterForm = document.getElementById("inverter-form")
const normalResult = document.getElementById("normal-load")
const surgeResult = document.getElementById("surge-load")
const inverterResult = document.getElementById("inverter-size")

inverterForm.addEventListener("submit", e => {
    
    e.preventDefault()
    
    const safeMarginInput = Number(document.getElementById("safety-margin").value);
    const surgeMultiplier = Number(document.getElementById("surge-multiplier").value);
    

    try {
        validateInverterInput(safeMarginInput, surgeMultiplier)

        const safeMargin = safeMarginInput / 100

        const load = calculatePeakLoad(appliances, surgeMultiplier)

        const inverterSize = Math.max(
            calculateInverterSize(load.normalLoad, safeMargin),
            load.totalLoad
        )

        showResult(normalResult, `${load.normalLoad} W`)
        showResult(surgeResult, `${load.surgeLoad} W`)
        showResult(inverterResult, `${inverterSize} W`)

        
        document.getElementById("inverter-error").innerText = ''
    } catch (error) {
        document.getElementById("inverter-error").innerText = error
    }
    
})

// -------------- End of Inverter sizing functions----------------------

loadData()
renderAppliances()


//document.querySelector('.small').addEventListener('click', console.log('small'))