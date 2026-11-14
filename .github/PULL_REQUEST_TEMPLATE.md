## Qué cambia

<!-- Una o dos frases. Si arregla un issue, enlázalo: Closes #12 -->

## Cómo lo probaste

- [ ] `pnpm check` en verde
- [ ] `pnpm --filter @parq/web build` en verde
- [ ] Probado con el broker real, no solo con datos de demostración

## Capturas

<!-- Si toca la interfaz, antes y después. Sin datos personales ni placas legibles. -->

## Checklist

- [ ] No hay claves, tokens ni certificados en el diff
- [ ] Los topics y payloads siguen el contrato de `packages/shared`
- [ ] Si cambia `broker/nodos.json`, se actualizó `broker/acl`
- [ ] La documentación afectada (`README.md`, `docs/docker.md`) está al día
