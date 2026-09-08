const NHTSA='https://vpic.nhtsa.dot.gov/api/vehicles';
function clean(v){return String(v||'').trim()}
function number(v){const n=Number(String(v??'').replace(/[$,\s]/g,''));return Number.isFinite(n)&&n>0?n:null}
function extractVin(text){const m=String(text||'').toUpperCase().match(/\b([A-HJ-NPR-Z0-9]{17})\b/);return m?.[1]||''}
async function decodeVin(vin){
  vin=clean(vin).toUpperCase();if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin))return{ok:false,error:'No valid 17-character VIN found'};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
  try{
    const r=await fetch(`${NHTSA}/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'ExpenseIntel/1.0 (+https://www.expenseintel.com)'}});if(!r.ok)throw new Error(`NHTSA VIN decode ${r.status}`);
    const d=await r.json(),x=(d.Results||[])[0]||{},year=clean(x.ModelYear),make=clean(x.Make),model=clean(x.Model);if(!year||!make||!model)return{ok:false,error:'NHTSA could not identify this VIN'};
    return{ok:true,vin,year,make,model,trim:clean(x.Trim),trim2:clean(x.Trim2),series:clean(x.Series),series2:clean(x.Series2),bodyClass:clean(x.BodyClass),vehicleType:clean(x.VehicleType),driveType:clean(x.DriveType),fuelType:clean(x.FuelTypePrimary),fuelTypeSecondary:clean(x.FuelTypeSecondary),electrificationLevel:clean(x.ElectrificationLevel),engineCylinders:clean(x.EngineCylinders),engineHp:clean(x.EngineHP),engineKw:clean(x.EngineKW),engineModel:clean(x.EngineModel),displacementL:clean(x.DisplacementL),transmissionStyle:clean(x.TransmissionStyle),transmissionSpeeds:clean(x.TransmissionSpeeds),doors:clean(x.Doors),seats:clean(x.Seats),seatRows:clean(x.SeatRows),gvwr:clean(x.GVWR),curbWeightLb:clean(x.CurbWeightLB),basePrice:number(x.BasePrice),batteryKwh:number(x.BatteryKWh),batteryVoltage:number(x.BatteryV),chargerLevel:clean(x.ChargerLevel),plantCountry:clean(x.PlantCountry),plantCity:clean(x.PlantCity),plantState:clean(x.PlantState),manufacturer:clean(x.Manufacturer),manufacturerId:clean(x.ManufacturerId),modelId:clean(x.ModelID),source:'NHTSA vPIC VIN Decoder',sourceUrl:'https://vpic.nhtsa.dot.gov/api/',grade:'A',retrievedAt:new Date().toISOString(),note:'VIN attributes are decoded from manufacturer submissions to NHTSA. Manufacturer-reported base price, when present, is identity/context data and is not treated as current market value.'}
  }catch(e){return{ok:false,error:String(e?.message||e)}}finally{clearTimeout(timer)}
}
module.exports={extractVin,decodeVin};