import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, QrCode, X } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string;
  onConfirmConnection: () => void;
  isConfirming: boolean;
}

const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  qrCode,
  onConfirmConnection,
  isConfirming
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <DialogHeader className="relative">
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <DialogTitle className="flex items-center gap-2 text-green-800">
            <QrCode className="h-5 w-5 text-green-600" />
            Código QR de WhatsApp
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-6 p-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl blur-lg opacity-30"></div>
            <div className="relative bg-white p-6 rounded-2xl shadow-xl border-2 border-green-100">
              <img 
                src={qrCode} 
                alt="Código QR de WhatsApp" 
                className="w-64 h-64 object-contain rounded-lg"
              />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-green-800">
              Escanea este código QR con tu aplicación de WhatsApp
            </p>
            <p className="text-xs text-green-600">
              Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo
            </p>
          </div>
          
          <Button 
            onClick={onConfirmConnection}
            disabled={isConfirming}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
          >
            {isConfirming ? (
              <>
                <CheckCircle className="mr-2 h-5 w-5 animate-spin" />
                Confirmando conexión...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                He conectado mi WhatsApp
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRModal;