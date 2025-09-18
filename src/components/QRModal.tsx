import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Código QR de WhatsApp</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 p-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <img 
              src={qrCode} 
              alt="Código QR de WhatsApp" 
              className="w-64 h-64 object-contain"
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Escanea este código QR con tu aplicación de WhatsApp
          </p>
          <Button 
            onClick={onConfirmConnection}
            disabled={isConfirming}
            className="w-full"
          >
            {isConfirming ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
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