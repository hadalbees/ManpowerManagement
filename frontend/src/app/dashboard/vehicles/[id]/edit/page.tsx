'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '../../../../../components/DashboardLayout';
import { 
  vehiclesApi, VehicleTypeOption, FuelTypeOption 
} from '../../../../../lib/vehicles-api';
import { clientsApi, ClientItem } from '../../../../../lib/clients-api';
import { 
  Truck, ArrowLeft, Save, AlertTriangle, Building2, 
  Fuel, Gauge, ShieldCheck 
} from 'lucide-react';

export default function EditVehiclePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookups
  const [types, setTypes] = useState<VehicleTypeOption[]>([]);
  const [fuels, setFuels] = useState<FuelTypeOption[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);

  // Fixed registration
  const [registrationNumber, setRegistrationNumber] = useState('');

  // Ownership state
  const [isClientDedicated, setIsClientDedicated] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    vehicleMake: '',
    vehicleModel: '',
    vehicleType: 'TRUCK',
    fuelType: 'DIESEL',
    chassisNumber: '',
    engineNumber: '',
    manufacturingYear: 2024,
    currentOdometerKm: 0,
    clientId: '',
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [typesRes, fuelsRes, clientsRes, vehRes] = await Promise.all([
          vehiclesApi.getVehicleTypes(),
          vehiclesApi.getFuelTypes(),
          clientsApi.getClients({ limit: 100 }),
          vehiclesApi.getVehicleById(id),
        ]);

        if (typesRes.success && typesRes.data) setTypes(typesRes.data);
        if (fuelsRes.success && fuelsRes.data) setFuels(fuelsRes.data);
        if (clientsRes.success && clientsRes.data) setClients(clientsRes.data.items || []);

        if (vehRes.success && vehRes.data) {
          const v = vehRes.data;
          setRegistrationNumber(v.vehicleRegistrationNumber);
          setIsClientDedicated(Boolean(v.clientId));
          setFormData({
            vehicleMake: v.vehicleMake,
            vehicleModel: v.vehicleModel,
            vehicleType: v.vehicleType,
            fuelType: v.fuelType,
            chassisNumber: v.chassisNumber,
            engineNumber: v.engineNumber,
            manufacturingYear: v.manufacturingYear,
            currentOdometerKm: v.currentOdometerKm,
            clientId: v.clientId || '',
          });
        } else {
          setError(vehRes.error?.message || 'Vehicle not found');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading vehicle details');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        vehicleMake: formData.vehicleMake.trim(),
        vehicleModel: formData.vehicleModel.trim(),
        vehicleType: formData.vehicleType,
        fuelType: formData.fuelType,
        chassisNumber: formData.chassisNumber.trim().toUpperCase(),
        engineNumber: formData.engineNumber.trim().toUpperCase(),
        manufacturingYear: Number(formData.manufacturingYear),
        currentOdometerKm: Number(formData.currentOdometerKm),
        clientId: isClientDedicated && formData.clientId ? formData.clientId : null,
      };

      const res = await vehiclesApi.updateVehicle(id, payload);
      if (res.success) {
        router.push(`/dashboard/vehicles/${id}`);
      } else {
        setError(res.error?.message || 'Failed to update vehicle');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Edit Vehicle">
        <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          Loading vehicle specifications...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Edit Specifications: ${registrationNumber}`}
      subtitle="Update technical attributes and client dedicated assignments"
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <Link
            href={`/dashboard/vehicles/${id}`}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          >
            <ArrowLeft size={16} /> Back to Dossier
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
          {/* Identity */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Truck size={20} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Vehicle Identification</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label className="label">Registration Number (Immutable)</label>
                <input
                  type="text"
                  disabled
                  value={registrationNumber}
                  className="input"
                  style={{ opacity: 0.7, fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              <div>
                <label className="label">Manufacturer / Make *</label>
                <input
                  type="text"
                  name="vehicleMake"
                  required
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

          {/* Technical Specs */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Gauge size={20} color="var(--primary-400)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Technical Specifications</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label className="label">Vehicle Type *</label>
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
                  value={formData.engineNumber}
                  onChange={handleChange}
                  className="input"
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                />
              </div>
            </div>
          </div>

          {/* Ownership */}
          <div className="card" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={20} color="var(--primary-400)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Ownership & Client Allocation</h3>
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
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Vehicle is configured as general agency-owned fleet pool.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
            <Link href={`/dashboard/vehicles/${id}`} className="btn-secondary" style={{ textDecoration: 'none' }}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={18} />
              {saving ? 'Saving Specs...' : 'Save Specifications'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
