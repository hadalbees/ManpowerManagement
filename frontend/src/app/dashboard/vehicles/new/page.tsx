'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '../../../../components/DashboardLayout';
import { 
  vehiclesApi, VehicleTypeOption, FuelTypeOption 
} from '../../../../lib/vehicles-api';
import { clientsApi, ClientItem } from '../../../../lib/clients-api';
import { 
  Truck, ArrowLeft, Save, AlertTriangle, Building2, 
  Fuel, Gauge, ShieldCheck, Car 
} from 'lucide-react';

export default function NewVehiclePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookups
  const [types, setTypes] = useState<VehicleTypeOption[]>([]);
  const [fuels, setFuels] = useState<FuelTypeOption[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);

  // Ownership state
  const [isClientDedicated, setIsClientDedicated] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    vehicleRegistrationNumber: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleType: 'TRUCK',
    fuelType: 'DIESEL',
    chassisNumber: '',
    engineNumber: '',
    manufacturingYear: new Date().getFullYear(),
    currentOdometerKm: 0,
    clientId: '',
  });

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [typesRes, fuelsRes, clientsRes] = await Promise.all([
          vehiclesApi.getVehicleTypes(),
          vehiclesApi.getFuelTypes(),
          clientsApi.getClients({ limit: 100 }),
        ]);

        if (typesRes.success && typesRes.data) {
          setTypes(typesRes.data);
          if (typesRes.data.length > 0) {
            setFormData((prev) => ({ ...prev, vehicleType: typesRes.data![0].code }));
          }
        }

        if (fuelsRes.success && fuelsRes.data) {
          setFuels(fuelsRes.data);
          if (fuelsRes.data.length > 0) {
            setFormData((prev) => ({ ...prev, fuelType: fuelsRes.data![0].code }));
          }
        }

        if (clientsRes.success && clientsRes.data) {
          setClients(clientsRes.data.items || []);
        }
      } catch (err) {
        console.error('Error loading metadata:', err);
      }
    }

    loadMetadata();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.vehicleRegistrationNumber || !formData.vehicleMake || !formData.vehicleModel || !formData.chassisNumber || !formData.engineNumber) {
      setError('Please fill in all mandatory vehicle registration and technical specification fields.');
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        vehicleRegistrationNumber: formData.vehicleRegistrationNumber.trim().toUpperCase(),
        vehicleMake: formData.vehicleMake.trim(),
        vehicleModel: formData.vehicleModel.trim(),
        vehicleType: formData.vehicleType,
        fuelType: formData.fuelType,
        chassisNumber: formData.chassisNumber.trim().toUpperCase(),
        engineNumber: formData.engineNumber.trim().toUpperCase(),
        manufacturingYear: Number(formData.manufacturingYear),
        currentOdometerKm: Number(formData.currentOdometerKm) || 0,
        clientId: isClientDedicated && formData.clientId ? formData.clientId : undefined,
      };

      const res = await vehiclesApi.createVehicle(payload);
      if (res.success && res.data) {
        router.push(`/dashboard/vehicles/${res.data.id}`);
      } else {
        setError(res.error?.message || 'Failed to register fleet vehicle');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Register Fleet Vehicle"
      subtitle="Onboard commercial transport asset, configure specifications, and establish handover baseline"
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <Link
            href="/dashboard/vehicles"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          >
            <ArrowLeft size={16} /> Back to Fleet Directory
          </Link>
        </div>

        {error && (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '12px',
            color: '#f43f5e',
            fontSize: '0.9rem',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Registration & Identity */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Truck size={20} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>1. Vehicle Identification & Registration</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label className="label">Registration Number (RTO) *</label>
                <input
                  type="text"
                  name="vehicleRegistrationNumber"
                  required
                  placeholder="e.g. TN 01 AB 1234 or DL 04 C 5678"
                  value={formData.vehicleRegistrationNumber}
                  onChange={handleChange}
                  className="input"
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Auto-normalized and checked for unique agency allocation
                </span>
              </div>

              <div>
                <label className="label">Manufacturer / Make *</label>
                <input
                  type="text"
                  name="vehicleMake"
                  required
                  placeholder="e.g. Tata Motors, Mahindra, Ashok Leyland"
                  value={formData.vehicleMake}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Vehicle Model *</label>
                <input
                  type="text"
                  name="vehicleModel"
                  required
                  placeholder="e.g. Ace Gold HT, Bolero Maxi Truck, Dost+"
                  value={formData.vehicleModel}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Manufacturing Year *</label>
                <input
                  type="number"
                  name="manufacturingYear"
                  required
                  min={1990}
                  max={new Date().getFullYear() + 1}
                  value={formData.manufacturingYear}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Technical Specifications */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Gauge size={20} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>2. Technical Specifications & Odometer</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label className="label">Vehicle Type / Body Class *</label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  className="input"
                >
                  {types.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Fuel Type *</label>
                <select
                  name="fuelType"
                  value={formData.fuelType}
                  onChange={handleChange}
                  className="input"
                >
                  {fuels.map((f) => (
                    <option key={f.code} value={f.code}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Current Odometer (km) *</label>
                <input
                  type="number"
                  name="currentOdometerKm"
                  required
                  min={0}
                  value={formData.currentOdometerKm}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Chassis Number (VIN) *</label>
                <input
                  type="text"
                  name="chassisNumber"
                  required
                  placeholder="e.g. MAT612001A1B2C3D4"
                  value={formData.chassisNumber}
                  onChange={handleChange}
                  className="input"
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label className="label">Engine Number *</label>
                <input
                  type="text"
                  name="engineNumber"
                  required
                  placeholder="e.g. ENG475ID456789"
                  value={formData.engineNumber}
                  onChange={handleChange}
                  className="input"
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Ownership & Allocation */}
          <div className="card" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={20} color="var(--primary-400)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>3. Ownership & Client Allocation</h3>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={isClientDedicated}
                  onChange={(e) => setIsClientDedicated(e.target.checked)}
                />
                Client-Dedicated Asset
              </label>
            </div>

            {isClientDedicated ? (
              <div>
                <label className="label">Assign to Client Organization *</label>
                <select
                  name="clientId"
                  required={isClientDedicated}
                  value={formData.clientId}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">-- Select Client Organization --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.clientCode})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                  This vehicle will be reserved for dispatch and billing under this client organization.
                </span>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Vehicle is registered as general agency-owned fleet pool. Available for ad-hoc and flexible client dispatch.
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
            <Link href="/dashboard/vehicles" className="btn-secondary" style={{ textDecoration: 'none' }}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={18} />
              {loading ? 'Registering Asset...' : 'Register Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
