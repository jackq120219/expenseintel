'use strict';
const VIN=/^[A-HJ-NPR-Z0-9]{17}$/;
const clean=value=>String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=604800');
  const vin=clean(req.query?.vin);
  const modelYear=String(req.query?.modelYear||'').replace(/\D/g,'').slice(0,4);
  if(!VIN.test(vin))return res.status(400).json({ok:false,error:'Provide a valid 17-character VIN. Letters I, O and Q are not used in VINs.'});
  const url=`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json${modelYear?`&modelyear=${modelYear}`:''}`;
  try{
    const upstream=await fetch(url,{headers:{Accept:'application/json','User-Agent':'ExpenseIntel/1.0 public-evidence'},signal:AbortSignal.timeout(6500)});
    if(!upstream.ok)throw new Error(`NHTSA ${upstream.status}`);
    const data=await upstream.json();
    const r=data?.Results?.[0];
    if(!r)throw new Error('NHTSA returned no decode result');
    const errorCode=String(r.ErrorCode||'');
    const cleanDecode=errorCode==='0'||/^0(?:,|$)/.test(errorCode);
    const vehicle={vin,make:r.Make||null,model:r.Model||null,modelYear:r.ModelYear||null,trim:r.Trim||null,bodyClass:r.BodyClass||null,vehicleType:r.VehicleType||null,manufacturer:r.Manufacturer||r.ManufacturerName||null,fuelType:r.FuelTypePrimary||null,driveType:r.DriveType||null,engineCylinders:r.EngineCylinders||null,displacementL:r.DisplacementL||null,plantCountry:r.PlantCountry||null};
    return res.status(200).json({ok:true,decodedCleanly:cleanDecode,vehicle,errorCode,errorText:r.ErrorText||null,evidence:{class:'public',authority:'National Highway Traffic Safety Administration',dataset:'vPIC',method:'VIN decode from manufacturer-submitted vehicle product information',observedAt:null,retrievedAt:new Date().toISOString()},source:'NHTSA vPIC'});
  }catch(error){
    return res.status(200).json({ok:false,vin,error:'NHTSA vehicle identity is temporarily unavailable.',detail:String(error?.message||error),source:'NHTSA vPIC',retrievedAt:new Date().toISOString()});
  }
};
