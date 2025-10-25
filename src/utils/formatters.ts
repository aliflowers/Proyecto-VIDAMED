export const formatCurrency = (amount: number | null | undefined, currency: 'bs' | 'usd' = 'bs'): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N/A';
  }

  const formatted = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  if (currency === 'bs') {
    return `Bs. ${formatted}`;
  }

  return `$${formatted}`;
};

export const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`; // Formato DD-MM-YYYY solicitado
  } catch (error) {
    return 'Fecha inválida';
  }
};
