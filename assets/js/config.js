/*
 * Configuração do convite.
 *
 * API_URL: endereço do App da Web do Apps Script (termina em /exec).
 * Enquanto estiver vazio, o site roda em modo demonstração e nada é salvo.
 */
window.CONVITE = {
  API_URL: 'https://script.google.com/macros/s/AKfycbxUAQFCcsxwp1ZcligR_WSsljGl0BIEwJdqlu4WiIwW32W3rgwi_tpN4DX7JcZdb3wQ/exec',

  // Usados até a planilha responder e como reserva se ela não tiver a data.
  DATA_PADRAO: '24/10/2026 15:00',
  DURACAO_HORAS: 5,
  ANFITRIAO: 'Vinícius',
};
