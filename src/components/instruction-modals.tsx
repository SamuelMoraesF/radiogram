import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function InstructionModals() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
      <a 
        href="/instrucoes.pdf" 
        download="instrucoes.pdf" 
        className={buttonVariants({ variant: "secondary", size: "sm", className: "text-xs font-semibold" })}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Radiogramas USRA - Instruções</span>
      </a>

      <a 
        href="/form.pdf" 
        download="form.pdf" 
        className={buttonVariants({ variant: "secondary", size: "sm", className: "text-xs font-semibold" })}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Formulário Radiograma ARRL</span>
      </a>

      <Dialog>
        <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm", className: "text-xs font-semibold" })}>
          Instruções de Tratamento (HX)
        </DialogTrigger>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Instruções de Tratamento de Mensagens</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-2 text-sm space-y-4 text-muted-foreground">
            <p>
              As Instruções de Tratamento (HX) transmitem instruções especiais aos
              operadores responsáveis pelo encaminhamento e entrega da mensagem.
              Seu uso é opcional para a estação de origem, mas, uma vez inserida,
              torna-se obrigatória para todas as estações retransmissoras.
            </p>
            <div className="space-y-3">
              <div>
                <strong className="text-foreground font-mono">HXA</strong>
                <p>
                  (Seguido de um número.) Autorizada a cobrança da entrega por
                  meio terrestre ao destinatário dentro de _____ quilômetros.
                  (Se não houver número, a autorização é ilimitada.)
                </p>
              </div>
              <div>
                <strong className="text-foreground font-mono">HXB</strong>
                <p>
                  (Seguido de um número.) Cancelar a mensagem caso não seja
                  entregue dentro de ____ horas a partir do horário de registro;
                  informar a estação de origem.
                </p>
              </div>
              <div>
                <strong className="text-foreground font-mono">HXC</strong>
                <p>
                  Informar à estação de origem a data e a hora da entrega (TOD –
                  Time of Delivery).
                </p>
              </div>
              <div>
                <strong className="text-foreground font-mono">HXD</strong>
                <p>
                  Informar à estação de origem a identificação da estação da qual
                  a mensagem foi recebida, juntamente com a data e a hora. Informar
                  também a identificação da estação para a qual a mensagem foi
                  retransmitida, com a respectiva data e hora; ou, se a mensagem
                  foi entregue, informar a data, a hora e o método de entrega.
                </p>
              </div>
              <div>
                <strong className="text-foreground font-mono">HXE</strong>
                <p>
                  A estação entregadora deve obter uma resposta do destinatário e
                  originar uma mensagem de retorno.
                </p>
              </div>
              <div>
                <strong className="text-foreground font-mono">HXF</strong>
                <p>
                  (Seguido de um número.) Reter a entrega até _____ (data).
                </p>
              </div>
              <div>
                <strong className="text-foreground font-mono">HXG</strong>
                <p>
                  Não é necessária a entrega por correio nem por chamada telefônica
                  tarifada. Se houver pedágio, tarifa ou qualquer outra despesa
                  envolvida, cancelar a mensagem e informar a estação de origem.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm", className: "text-xs font-semibold" })}>
          Textos Numerados ARRL
        </DialogTrigger>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Mensagens Radiográficas Numeradas (ARL)</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-2 text-sm space-y-4 text-muted-foreground">
            <p>
              As mensagens radiográficas numeradas são uma forma eficiente de
              transmitir mensagens comuns. As letras ARL são inseridas no
              Preâmbulo, no campo Check, e no texto antes dos números escritos
              por extenso.
            </p>
            <ul className="space-y-3">
              <li>
                <strong className="text-foreground">UM (ONE)</strong>: Todos estão em segurança aqui. Por favor, não se preocupe.
              </li>
              <li>
                <strong className="text-foreground">DOIS (TWO)</strong>: Voltarei para casa assim que possível.
              </li>
              <li>
                <strong className="text-foreground">TRÊS (THREE)</strong>: Estou no hospital _____. Estou recebendo excelente atendimento e me recuperando muito bem.
              </li>
              <li>
                <strong className="text-foreground">QUATRO (FOUR)</strong>: Houve apenas pequenos danos materiais aqui. Não se preocupe com os relatos sobre o desastre.
              </li>
              <li>
                <strong className="text-foreground">CINCO (FIVE)</strong>: Estou mudando para um novo local. Não envie mais correspondências nem outras comunicações. Informarei meu novo endereço assim que estiver instalado.
              </li>
              <li>
                <strong className="text-foreground">SEIS (SIX)</strong>: Entrarei em contato assim que possível.
              </li>
              <li>
                <strong className="text-foreground">SETE (SEVEN)</strong>: Por favor, responda por meio do Serviço de Radioamador, através do radioamador que entregar esta mensagem. Este é um serviço público gratuito.
              </li>
              <li>
                <strong className="text-foreground">OITO (EIGHT)</strong>: São necessários equipamentos móveis ou portáteis adicionais de _____ para uso imediato em emergência.
              </li>
              <li>
                <strong className="text-foreground">NOVE (NINE)</strong>: São necessários operadores de rádio _____ adicionais para auxiliar na emergência neste local.
              </li>
              <li>
                <strong className="text-foreground">DEZ (TEN)</strong>: Por favor, entre em contato com _____. Oriente a permanecer em prontidão e fornecer informações, instruções ou assistência adicional relacionadas à emergência.
              </li>
              <li>
                <strong className="text-foreground">ONZE (ELEVEN)</strong>: Estabeleça comunicações de emergência pelo Serviço de Radioamador com _____ na frequência de _____ MHz.
              </li>
              <li>
                <strong className="text-foreground">DOZE (TWELVE)</strong>: Estou ansioso por notícias suas. Não recebo informações há algum tempo. Por favor, entre em contato comigo assim que possível.
              </li>
              <li>
                <strong className="text-foreground">TREZE (THIRTEEN)</strong>: Existe uma situação de emergência médica neste local.
              </li>
              <li>
                <strong className="text-foreground">QUATORZE (FOURTEEN)</strong>: A situação aqui está se tornando crítica. As perdas e os danos causados por _____ estão aumentando.
              </li>
              <li>
                <strong className="text-foreground">QUINZE (FIFTEEN)</strong>: Por favor, informe sua condição e qual ajuda é necessária.
              </li>
              <li>
                <strong className="text-foreground">DEZESSEIS (SIXTEEN)</strong>: Os danos materiais são muito graves nesta área.
              </li>
              <li>
                <strong className="text-foreground">DEZESSETE (SEVENTEEN)</strong>: Os serviços de comunicação da REACT também estão disponíveis. Estabeleça comunicação via REACT com _____ no canal _____.
              </li>
              <li>
                <strong className="text-foreground">DEZOITO (EIGHTEEN)</strong>: Por favor, entre em contato comigo assim que possível pelo número/endereço _____.
              </li>
              <li>
                <strong className="text-foreground">DEZENOVE (NINETEEN)</strong>: Solicita-se um relatório sobre a saúde e o bem-estar de _____ (nome, endereço, telefone).
              </li>
              <li>
                <strong className="text-foreground">VINTE (TWENTY)</strong>: Estou temporariamente impossibilitado de prosseguir viagem. Precisarei de alguma assistência. Por favor, entre em contato comigo em _____.
              </li>
              <li>
                <strong className="text-foreground">VINTE E UM (TWENTY ONE)</strong>: As autoridades locais necessitam de apoio em Busca e Salvamento (Search and Rescue – SAR) neste local. Informe a disponibilidade.
              </li>
              <li>
                <strong className="text-foreground">VINTE E DOIS (TWENTY TWO)</strong>: Necessitamos de informações precisas sobre a extensão e o tipo das condições atualmente existentes em sua localidade. Por favor, forneça essas informações e responda sem demora.
              </li>
              <li>
                <strong className="text-foreground">VINTE E TRÊS (TWENTY THREE)</strong>: Informe imediatamente as condições de acesso e a melhor forma de chegar à sua localidade.
              </li>
              <li>
                <strong className="text-foreground">VINTE E QUATRO (TWENTY FOUR)</strong>: A evacuação dos moradores desta área é urgentemente necessária. Informe os planos de assistência.
              </li>
              <li>
                <strong className="text-foreground">VINTE E CINCO (TWENTY FIVE)</strong>: Forneça, o mais rapidamente possível, as condições meteorológicas em sua localidade.
              </li>
              <li>
                <strong className="text-foreground">VINTE E SEIS (TWENTY SIX)</strong>: É necessária, com urgência, ajuda e assistência para a evacuação dos doentes e feridos deste local.
              </li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
