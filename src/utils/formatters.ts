export const formatCurrency = (amount: number | null | undefined, currency: 'USD' | 'BS' = 'USD') => {
  if (amount === null || amount === undefined) return 'N/A';
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });
  return formatter.format(amount);
};

export const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return 'Fecha inválida';
  }
};