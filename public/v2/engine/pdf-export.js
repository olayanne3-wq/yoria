/**
 * pdf-export.js
 * Export PDF du plan d'entraînement — Yoria v2.0
 *
 * Dépend de la librairie externe jsPDF + jspdf-autotable, chargée via
 * <script src="..."> dans le <head> du document (pas un import ES) et
 * exposée globalement sous window.jspdf. Ce module ne fait aucune
 * hypothèse sur le DOM en dehors de cette dépendance globale ; il ne lit
 * ni n'écrit d'éléments HTML, il ne fait que générer et déclencher le
 * téléchargement du PDF via doc.save(...).
 *
 * genererEtTelechargerPDF reçoit le plan en paramètre plutôt que de lire
 * une variable globale (dernierPlanGenere dans l'original) : rend le
 * module testable et réutilisable indépendamment de l'état du wizard.
 */

const LOGO_BASE64 = 'data:image/png;base64,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';
  export function genererEtTelechargerPDF(plan){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const marge = 15;
    const largeurUtile = 210 - marge * 2;
    const COULEUR_SIGNAL = [255, 90, 52];
    const COULEUR_TEXTE = [30, 30, 30];
    let y = marge;

    function formatDateFR(dateStr) {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    // Couleur par type/sous-type de séance, pour un repérage visuel rapide
    const COULEURS_SEANCE = {
      longue: [37, 99, 235],           // bleu
      ef: [107, 114, 128],             // gris neutre
      repos: [180, 180, 180],          // gris clair
      seuil: [217, 119, 6],            // orange
      'seuil-court': [217, 119, 6],
      'tempo-court': [217, 119, 6],
      'i-3min': [220, 38, 38],         // rouge (VMA)
      'i-30-30': [220, 38, 38],
      vitesse: [147, 51, 234],         // violet
      'allure-course': [22, 163, 74],  // vert
      'allure-course-court': [22, 163, 74],
      test: [22, 163, 74],
      cotes: [120, 80, 60],            // marron
      fartlek: [13, 148, 136],          // teal
      pyramidale: [220, 38, 38],        // rouge (VMA, même famille que i-3min)
      'seuil-negatif': [217, 119, 6]    // orange (famille seuil)
    };
    function couleurSeance(a) {
      if (!a) return COULEURS_SEANCE.repos;
      if (a.type === 'longue') return COULEURS_SEANCE.longue;
      if (a.type === 'ef') return COULEURS_SEANCE.ef;
      if (a.type === 'qualite') return COULEURS_SEANCE[a.sousType] ?? COULEUR_TEXTE;
      return COULEURS_SEANCE.repos;
    }

    function sautDeLigne(hauteur) {
      y += hauteur;
      if (y > 297 - marge) { doc.addPage(); y = marge; }
    }
    function texte(str, taille, gras, couleur) {
      doc.setFontSize(taille);
      doc.setFont(undefined, gras ? 'bold' : 'normal');
      if (Array.isArray(couleur)) {
        doc.setTextColor(couleur[0], couleur[1], couleur[2]);
      } else {
        doc.setTextColor(couleur ?? 20);
      }
      const lignes = doc.splitTextToSize(str, largeurUtile);
      lignes.forEach(l => {
        doc.text(l, marge, y);
        sautDeLigne(taille * 0.42);
      });
    }

    // En-tête avec logo
    try {
      doc.addImage(LOGO_BASE64, 'PNG', marge, y, 14, 14);
    } catch (e) {
      console.error('Logo non chargé dans le PDF :', e);
    }
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(20);
    doc.text('Yoria — Plan d\'entraînement', marge + 18, y + 9);
    y += 18;
    texte(`Distance : ${plan.distance}  |  Objectif : ${plan.objectif}  |  Durée : ${plan.dureeSemaines} semaines`, 10);
    texte(`Du ${formatDateFR(plan.dateDebut)} au ${formatDateFR(plan.dateCourse)}`, 10);
    sautDeLigne(3);

    // Légende des couleurs
    const legendeItems = [
      ['Longue', COULEURS_SEANCE.longue], ['EF', COULEURS_SEANCE.ef],
      ['Seuil', COULEURS_SEANCE.seuil], ['VMA', COULEURS_SEANCE['i-3min']],
      ['Vitesse', COULEURS_SEANCE.vitesse], ['Allure course', COULEURS_SEANCE['allure-course']],
      ['Côtes/Fartlek', COULEURS_SEANCE.cotes]
    ];
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    let xLegende = marge;
    legendeItems.forEach(([label, couleur]) => {
      doc.setFillColor(couleur[0], couleur[1], couleur[2]);
      doc.circle(xLegende + 1, y - 1, 1, 'F');
      doc.setTextColor(60);
      doc.text(label, xLegende + 3.5, y);
      xLegende += doc.getTextWidth(label) + 9;
    });
    sautDeLigne(6);

    // Tableau fusionné allures + zones FC (mêmes zones des deux côtés)
    const labelsZones = { recup: 'Récup', E: 'EF', C: 'Allure course', T: 'Seuil', I: 'VMA', V: 'Vitesse' };
    const lignesZones = Object.entries(plan.allures).map(([zone, allure]) => {
      const fc = plan.zoneFC?.zonesParType?.[zone];
      return [labelsZones[zone] ?? zone, allure, fc ? `${fc.min}-${fc.max} bpm` : '—'];
    });
    doc.autoTable({
      startY: y,
      margin: { left: marge, right: marge },
      head: [['Zone', 'Allure', 'FC']],
      body: lignesZones,
      theme: 'grid',
      headStyles: { fillColor: COULEUR_SIGNAL, fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: COULEUR_TEXTE },
      styles: { cellPadding: 2 }
    });
    y = doc.lastAutoTable.finalY + 8;
    if (plan.zoneFC) {
      texte(`FC max ${plan.zoneFC.methode === 'mesuree' ? 'mesurée' : 'estimée (Tanaka)'} : ${plan.zoneFC.fcMax} bpm`, 8.5);
      sautDeLigne(4);
    }

    const dayNames = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
    const jsDay = new Date(plan.dateCourse).getDay();
    const jourCourseIndex = (jsDay + 6) % 7;
    const derniereSemaineNum = plan.semaines.length ? plan.semaines[plan.semaines.length - 1].semaineNum : null;

    let dernierePhase = null;
    plan.semaines.forEach(semaine => {
      if (semaine.phase !== dernierePhase) {
        sautDeLigne(2);
        texte(semaine.phase, 13, true, COULEUR_SIGNAL);
        y = Math.max(y, marge);
        dernierePhase = semaine.phase;
      }

      // Estimation conservatrice de la place nécessaire pour cette semaine
      // (titre + tableau 7 lignes, détails potentiellement sur 2 lignes) —
      // si ça ne rentre pas, saut de page AVANT de commencer, pour ne jamais
      // couper le tableau d'une semaine entre deux pages.
      const ESPACE_NECESSAIRE_SEMAINE = 100;
      if (297 - marge - y < ESPACE_NECESSAIRE_SEMAINE) {
        doc.addPage();
        y = marge;
      }

      const dechargeTxt = semaine.estDechargeSemaine ? ' (décharge)' : '';
      texte(`Semaine ${semaine.semaineNum} — ${semaine.volumeCibleKm ?? '—'}km${dechargeTxt}`, 11, true);

      const lignesJours = [];
      const estCourse = [];
      const couleursJours = [];
      for (let i = 0; i < 7; i++) {
        if (semaine.semaineNum === derniereSemaineNum && i === jourCourseIndex) {
          lignesJours.push([dayNames[i], 'JOUR J', 'Course !']);
          estCourse.push(lignesJours.length - 1);
          couleursJours.push(null);
          continue;
        }
        const a = semaine.assignment[i];
        if (!a) { lignesJours.push([dayNames[i], 'Repos', '']); couleursJours.push(COULEURS_SEANCE.repos); continue; }
        let label = a.type === 'longue' ? 'Sortie longue'
          : a.type === 'qualite' ? (a.estTest ? 'Test' : 'Qualité')
          : a.type === 'ef' ? 'EF'
          : 'Repos' + (a.renfo ? ' + renfo' : '');
        lignesJours.push([dayNames[i], label, a.contenu ?? '']);
        couleursJours.push(couleurSeance(a));
      }

      doc.autoTable({
        startY: y,
        margin: { left: marge, right: marge },
        head: [['Jour', 'Séance', 'Détail']],
        body: lignesJours,
        theme: 'striped',
        headStyles: { fillColor: [42, 49, 56], fontSize: 8.5 },
        bodyStyles: { fontSize: 8.5, textColor: COULEUR_TEXTE },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 30 } },
        styles: { cellPadding: 1.8 },
        rowPageBreak: 'avoid',
        didParseCell: (data) => {
          if (estCourse.includes(data.row.index)) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = COULEUR_SIGNAL;
          } else {
            const c = couleursJours[data.row.index];
            if (c) {
              data.cell.styles.textColor = c;
              if (data.column.index === 1) data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });
      y = doc.lastAutoTable.finalY + 6;
    });

    if (plan.warnings.length) {
      sautDeLigne(2);
      texte('Avertissements', 12, true);
      plan.warnings.forEach(w => texte(`  [!] ${w.message}`, 9));
    }

    doc.save(`plan-${plan.distance}-${plan.dateCourse}.pdf`);
  }
