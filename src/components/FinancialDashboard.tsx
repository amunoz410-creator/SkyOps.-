import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  FinancialDashboardSummary,
  OperatingExpense,
  ExpenseCategory,
  MonthlyFinancialItem
} from '../types';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Clock,
  Fuel,
  Wrench,
  Users,
  ShieldCheck,
  ShieldAlert,
  Building,
  MonitorPlay,
  PlusCircle,
  Filter,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Plane,
  Receipt,
  FileSpreadsheet,
  Trash2,
  Edit2,
  CheckCircle2,
  RefreshCw,
  Info,
  ChevronDown
} from 'lucide-react';

interface FinancialDashboardProps {
  currentUser: User;
  onRefreshAll?: () => void;
}

const CATEGORY_LABELS: Record<ExpenseCategory, { label: string; icon: any; color: string; bg: string }> = {
  combustible: { label: 'Combustible AVGAS 100LL & Jet-A', icon: Fuel, color: '#0284C7', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
  nomina_instructores: { label: 'Honorarios Instructores CFI', icon: Users, color: '#6366F1', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  nomina_personal: { label: 'Planilla Operativa & Despacho', icon: Users, color: '#8B5CF6', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  mantenimiento: { label: 'Mantenimiento e Inspección 100h', icon: Wrench, color: '#F59E0B', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  hangaraje_tasas: { label: 'Hangaraje & Tasas Aeroportuarias', icon: Building, color: '#EC4899', bg: 'bg-pink-50 text-pink-700 border-pink-200' },
  seguros: { label: 'Pólizas de Seguro de Casco & R.C.', icon: ShieldCheck, color: '#10B981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  simulador_tecnologia: { label: 'Simulador ALSIM & Software Cloud', icon: MonitorPlay, color: '#06B6D4', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  otros_operativos: { label: 'Material Didáctico & Operaciones', icon: Layers, color: '#64748B', bg: 'bg-slate-50 text-slate-700 border-slate-200' }
};

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  currentUser,
  onRefreshAll
}) => {
  const { t } = useLanguage();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [summary, setSummary] = useState<FinancialDashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeChartTab, setActiveChartTab] = useState<'comparison' | 'profitability' | 'costPerHour'>('comparison');

  // Expense table filter state
  const [filterCategory, setFilterCategory] = useState<string>('todas');
  const [filterAircraft, setFilterAircraft] = useState<string>('todas');
  const [filterSearch, setFilterSearch] = useState<string>('');

  // Modal New Expense
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [expenseForm, setExpenseForm] = useState<{
    fecha: string;
    categoria: ExpenseCategory;
    concepto: string;
    monto: string;
    proveedor: string;
    factura_numero: string;
    matricula_asociada: string;
    metodo_pago: 'ACH' | 'Tarjeta Corporativa' | 'Cheque' | 'Efectivo';
    notas: string;
  }>({
    fecha: new Date().toISOString().slice(0, 10),
    categoria: 'combustible',
    concepto: '',
    monto: '',
    proveedor: '',
    factura_numero: '',
    matricula_asociada: 'HP-1822',
    metodo_pago: 'ACH',
    notas: ''
  });
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadFinancialData = async () => {
    if (currentUser.rol === 'instructor') {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setLoading(true);
      const data = await api.getFinancialSummary(selectedYear);
      setSummary(data);
    } catch (err) {
      console.error('Error al cargar datos financieros:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, [selectedYear]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFinancialData();
    if (onRefreshAll) onRefreshAll();
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.concepto || !expenseForm.monto || !expenseForm.proveedor) {
      alert('Por favor complete los campos obligatorios: concepto, monto y proveedor.');
      return;
    }

    try {
      setFormSubmitting(true);
      await api.createOperatingExpense({
        fecha: expenseForm.fecha,
        categoria: expenseForm.categoria,
        concepto: expenseForm.concepto,
        monto: Number(expenseForm.monto),
        proveedor: expenseForm.proveedor,
        factura_numero: expenseForm.factura_numero || undefined,
        matricula_asociada: expenseForm.matricula_asociada !== 'general' ? expenseForm.matricula_asociada : undefined,
        metodo_pago: expenseForm.metodo_pago,
        notas: expenseForm.notas || undefined,
        creado_por: currentUser.nombre
      });

      setSuccessMessage('Gasto operativo registrado exitosamente.');
      setTimeout(() => setSuccessMessage(null), 4000);
      setIsExpenseModalOpen(false);
      setExpenseForm({
        fecha: new Date().toISOString().slice(0, 10),
        categoria: 'combustible',
        concepto: '',
        monto: '',
        proveedor: '',
        factura_numero: '',
        matricula_asociada: 'HP-1822',
        metodo_pago: 'ACH',
        notas: ''
      });
      loadFinancialData();
    } catch (err: any) {
      alert(err.message || 'Error al registrar el gasto operativo.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string, concepto: string) => {
    if (!window.confirm(`¿Está seguro de eliminar el gasto "${concepto}"?`)) return;
    try {
      await api.deleteOperatingExpense(id);
      loadFinancialData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el gasto');
    }
  };

  const filteredExpenses = useMemo(() => {
    if (!summary?.gastosRecientes) return [];
    return summary.gastosRecientes.filter(exp => {
      const matchCat = filterCategory === 'todas' || exp.categoria === filterCategory;
      const matchAircraft = filterAircraft === 'todas' || exp.matricula_asociada === filterAircraft;
      const matchText = filterSearch === '' ||
        exp.concepto.toLowerCase().includes(filterSearch.toLowerCase()) ||
        exp.proveedor.toLowerCase().includes(filterSearch.toLowerCase()) ||
        (exp.factura_numero && exp.factura_numero.toLowerCase().includes(filterSearch.toLowerCase()));
      return matchCat && matchAircraft && matchText;
    });
  }, [summary, filterCategory, filterAircraft, filterSearch]);

  const formatUSD = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatUSDDetail = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload as MonthlyFinancialItem;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs min-w-[220px]">
          <p className="font-bold text-sm text-sky-400 mb-2 border-b border-slate-800 pb-1">
            {dataItem.mesCompleto}
          </p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-500 inline-block" />
                Ingresos Facturados:
              </span>
              <span className="font-bold text-white">{formatUSD(dataItem.ingresos)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                Gastos Operativos:
              </span>
              <span className="font-bold text-white">{formatUSD(dataItem.gastos)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                Utilidad Neta:
              </span>
              <span className={`font-extrabold ${dataItem.utilidadNeta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatUSD(dataItem.utilidadNeta)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400 pt-1 text-[11px]">
              <span>Margen Rentabilidad:</span>
              <span className="font-bold text-indigo-300">{dataItem.margenRentabilidad}%</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Horas Voladas:</span>
              <span className="font-semibold text-slate-200">{dataItem.horasVuelo.toFixed(1)} hrs</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Costo por Hora:</span>
              <span className="font-semibold text-amber-300">${dataItem.costoPorHora}/hr</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleExportCSV = () => {
    if (!summary) return;
    let csv = 'Mes,Ingresos USD,Gastos Operativos USD,Utilidad Neta USD,Margen %,Horas Vuelo,Costo/Hora USD,Ingreso/Hora USD\n';
    summary.desgloseMensual.forEach(m => {
      csv += `"${m.mesCompleto}",${m.ingresos},${m.gastos},${m.utilidadNeta},${m.margenRentabilidad},${m.horasVuelo},${m.costoPorHora},${m.ingresoPorHora}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SkyOps_Resumen_Financiero_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Cargando métricas y estados financieros de la escuela...</p>
      </div>
    );
  }

  if (currentUser.rol === 'instructor') {
    return (
      <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-sm text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Acceso Restringido a Finanzas</h3>
      </div>
    );
  }

  const resumen = summary?.resumenAnual;

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="skyops-financial-dashboard">
      {/* HEADER PRINCIPAL */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Dashboard Financiero y Rentabilidad
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Año {selectedYear}
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Acciones del Dashboard */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Año */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[2026, 2025, 2024].map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedYear === yr
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            title="Recalcular métricas"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* KPI EXECUTIVE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingresos */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ingresos Facturados</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatUSD(resumen?.totalIngresos || 0)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{resumen?.comparativaAnioAnterior.crecimientoIngresosPct}% vs año anterior</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Promedio: {formatUSD((resumen?.totalIngresos || 0) / 12)}/mes
          </div>
        </div>

        {/* Total Gastos Operativos */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gastos Operativos</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatUSD(resumen?.totalGastos || 0)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Representa el {(((resumen?.totalGastos || 0) / (resumen?.totalIngresos || 1)) * 100).toFixed(1)}% de ingresos</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Costo por Hora: <strong className="text-slate-700">${resumen?.costoPromedioHora}/hr</strong>
          </div>
        </div>

        {/* Utilidad Neta */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utilidad Neta</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {formatUSD(resumen?.utilidadNetaTotal || 0)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{resumen?.comparativaAnioAnterior.crecimientoUtilidadPct}% margen optimizado</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Margen Neto: <strong className="text-slate-700">${resumen?.margenPromedioHora}/hr volada</strong>
          </div>
        </div>

        {/* Margen de Rentabilidad Promedio */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Margen de Rentabilidad</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 tracking-tight">
              {resumen?.margenRentabilidadPromedio}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-700 font-medium">
            <span>{resumen?.totalHorasVuelo.toFixed(1)} horas de vuelo ejecutadas</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Facturación promedio: <strong className="text-slate-700">${resumen?.ingresoPromedioHora}/hr</strong>
          </div>
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL DE GRÁFICOS: COMPARATIVO MENSUAL */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span>Evolución Mensual de Ingresos, Gastos y Rentabilidad</span>
            </h2>
          </div>

          {/* Toggle View */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveChartTab('comparison')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeChartTab === 'comparison'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ingresos vs Gastos ($)
            </button>
            <button
              onClick={() => setActiveChartTab('profitability')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeChartTab === 'profitability'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Margen de Rentabilidad (%)
            </button>
            <button
              onClick={() => setActiveChartTab('costPerHour')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeChartTab === 'costPerHour'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Costos vs Ingresos / Hora
            </button>
          </div>
        </div>

        {/* Contenedor del Gráfico con Recharts */}
        <div className="h-[380px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {activeChartTab === 'comparison' ? (
              <BarChart
                data={summary?.desgloseMensual || []}
                margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="mesNombre"
                  tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 12, fontSize: 12, fontWeight: 600 }}
                  iconType="circle"
                />
                <Bar
                  dataKey="ingresos"
                  name="Ingresos Facturados ($ USD)"
                  fill="#0284C7"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="gastos"
                  name="Gastos Operativos ($ USD)"
                  fill="#F59E0B"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="utilidadNeta"
                  name="Utilidad Neta ($ USD)"
                  fill="#10B981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            ) : activeChartTab === 'profitability' ? (
              <BarChart
                data={summary?.desgloseMensual || []}
                margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="mesNombre"
                  tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${val}%`}
                  domain={[0, 50]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 12, fontSize: 12, fontWeight: 600 }}
                  iconType="circle"
                />
                <Bar
                  dataKey="margenRentabilidad"
                  name="Margen de Rentabilidad (%)"
                  fill="#6366F1"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                >
                  {(summary?.desgloseMensual || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.margenRentabilidad >= 35 ? '#10B981' : entry.margenRentabilidad >= 25 ? '#6366F1' : '#F59E0B'}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                data={summary?.desgloseMensual || []}
                margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="mesNombre"
                  tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 12, fontSize: 12, fontWeight: 600 }}
                  iconType="circle"
                />
                <Bar
                  dataKey="ingresoPorHora"
                  name="Ingreso por Hora ($/hr)"
                  fill="#0284C7"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="costoPorHora"
                  name="Costo Operativo por Hora ($/hr)"
                  fill="#EC4899"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="margenPorHora"
                  name="Margen Neto por Hora ($/hr)"
                  fill="#10B981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* DOS COLUMNAS: DESGLOSE POR CATEGORÍA & RENTABILIDAD POR AERONAVE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Desglose por Categoría de Gasto */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                Gastos Operativos por Rubro
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              Total: {formatUSD(resumen?.totalGastos || 0)}
            </span>
          </div>

          <div className="space-y-3.5 pt-1">
            {summary?.desglosePorCategoria.map((cat) => {
              const meta = CATEGORY_LABELS[cat.categoria] || {
                label: cat.label,
                icon: Layers,
                color: cat.color,
                bg: 'bg-slate-50 text-slate-700'
              };
              const Icon = meta.icon;

              return (
                <div key={cat.categoria} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                      <Icon className="w-3.5 h-3.5 text-slate-400 inline" />
                      {cat.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{formatUSD(cat.monto)}</span>
                      <span className="text-[11px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {cat.porcentaje}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.porcentaje}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rentabilidad por Aeronave / Flota (Unit Economics) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Plane className="w-4 h-4 text-sky-500" />
                Rentabilidad por Aeronave & Simulador
              </h3>
            </div>
            <span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg">
              5 Equipos Activos
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {summary?.desglosePorAeronave.map((ac) => (
              <div
                key={ac.matricula}
                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-slate-900 bg-slate-200 px-2 py-0.5 rounded">
                      {ac.matricula}
                    </span>
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                      {ac.modelo}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {ac.margen}% Margen
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-[11px] pt-1">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Horas</span>
                    <span className="font-bold text-slate-800">{ac.horas.toFixed(1)} h</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Ingresos</span>
                    <span className="font-bold text-sky-700">{formatUSD(ac.ingresos)}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Gastos</span>
                    <span className="font-bold text-amber-700">{formatUSD(ac.gastos)}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Utilidad</span>
                    <span className="font-extrabold text-emerald-600">{formatUSD(ac.utilidad)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TABLA DE AUDITORÍA Y GESTIÓN DE GASTOS OPERATIVOS */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-600" />
              Gastos Operativos
            </h3>
          </div>

          {/* Filtros de Tabla */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Buscar proveedor o concepto..."
                className="text-xs pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-48 sm:w-60"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium text-slate-700"
            >
              <option value="todas">Todas las categorías</option>
              <option value="combustible">Combustible AVGAS</option>
              <option value="mantenimiento">Mantenimiento 100h</option>
              <option value="nomina_instructores">Nómina Instructores</option>
              <option value="nomina_personal">Planilla Personal</option>
              <option value="hangaraje_tasas">Hangaraje & Tasas</option>
              <option value="seguros">Seguros de Flota</option>
              <option value="simulador_tecnologia">Simulador & Software</option>
              <option value="otros_operativos">Otros Operativos</option>
            </select>

            <select
              value={filterAircraft}
              onChange={(e) => setFilterAircraft(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium text-slate-700"
            >
              <option value="todas">Todas las matrículas</option>
              <option value="HP-1822">HP-1822 (Seminole)</option>
              <option value="HP-1450">HP-1450 (C172 G1000)</option>
              <option value="HP-1799">HP-1799 (Archer)</option>
              <option value="HP-1588">HP-1588 (C172)</option>
              <option value="SIM-ALX">SIM-ALX (Simulador)</option>
            </select>
          </div>
        </div>

        {/* Tabla Responsiva */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Concepto / Detalle</th>
                <th className="px-4 py-3">Proveedor / Entidad</th>
                <th className="px-4 py-3">Matrícula</th>
                <th className="px-4 py-3">Método / Factura</th>
                <th className="px-4 py-3 text-right">Monto ($ USD)</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-medium">
                    No se encontraron gastos operativos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const catMeta = CATEGORY_LABELS[exp.categoria] || {
                    label: exp.categoria,
                    bg: 'bg-slate-100 text-slate-700 border-slate-200'
                  };

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                        {exp.fecha}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${catMeta.bg}`}>
                          {catMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 max-w-[280px]">
                        <div>{exp.concepto}</div>
                        {exp.notas && (
                          <div className="text-[10px] text-slate-400 truncate">{exp.notas}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                        {exp.proveedor}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {exp.matricula_asociada ? (
                          <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] border border-slate-200">
                            {exp.matricula_asociada}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">General Flota</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-[11px]">
                        <div>{exp.metodo_pago}</div>
                        {exp.factura_numero && (
                          <span className="font-mono text-[10px] text-sky-700">{exp.factura_numero}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap">
                        {formatUSDDetail(exp.monto)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteExpense(exp.id, exp.concepto)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar gasto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REGISTRAR NUEVO GASTO OPERATIVO */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Registrar Gasto Operativo de la Escuela
                </h3>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.fecha}
                    onChange={(e) => setExpenseForm({ ...expenseForm, fecha: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={expenseForm.categoria}
                    onChange={(e) => setExpenseForm({ ...expenseForm, categoria: e.target.value as ExpenseCategory })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    <option value="combustible">Combustible AVGAS 100LL</option>
                    <option value="mantenimiento">Mantenimiento Flota 100h</option>
                    <option value="nomina_instructores">Nómina Instructores CFI</option>
                    <option value="nomina_personal">Planilla Despacho & Operaciones</option>
                    <option value="hangaraje_tasas">Hangaraje & Tasas AAC</option>
                    <option value="seguros">Seguro Aeronáutico</option>
                    <option value="simulador_tecnologia">Simulador & Software</option>
                    <option value="otros_operativos">Otros Operativos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Concepto / Descripción del Gasto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Suministro 600 galones AVGAS 100LL rampa MPPA"
                  value={expenseForm.concepto}
                  onChange={(e) => setExpenseForm({ ...expenseForm, concepto: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monto ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={expenseForm.monto}
                    onChange={(e) => setExpenseForm({ ...expenseForm, monto: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Proveedor / Beneficiario</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Terpel Aviación Panamá"
                    value={expenseForm.proveedor}
                    onChange={(e) => setExpenseForm({ ...expenseForm, proveedor: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. Factura</label>
                  <input
                    type="text"
                    placeholder="FAC-2026-99"
                    value={expenseForm.factura_numero}
                    onChange={(e) => setExpenseForm({ ...expenseForm, factura_numero: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Aeronave</label>
                  <select
                    value={expenseForm.matricula_asociada}
                    onChange={(e) => setExpenseForm({ ...expenseForm, matricula_asociada: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-bold"
                  >
                    <option value="general">Flota General</option>
                    <option value="HP-1822">HP-1822 (Seminole)</option>
                    <option value="HP-1450">HP-1450 (C172 G1000)</option>
                    <option value="HP-1799">HP-1799 (Archer)</option>
                    <option value="HP-1588">HP-1588 (C172)</option>
                    <option value="SIM-ALX">SIM-ALX (Simulador)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Método de Pago</label>
                  <select
                    value={expenseForm.metodo_pago}
                    onChange={(e) => setExpenseForm({ ...expenseForm, metodo_pago: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  >
                    <option value="ACH">ACH Bancario</option>
                    <option value="Tarjeta Corporativa">Tarjeta Corporativa</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Efectivo">Caja Chica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas / Justificación (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Detalles adicionales para auditoría..."
                  value={expenseForm.notas}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notas: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? 'Guardando...' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
